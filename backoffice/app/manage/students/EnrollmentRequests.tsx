"use client";

import { App, Button, Card, Input, Modal, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { Check, X } from "lucide-react";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { EnrollmentRequest } from "@/app/types/api";

// Requests sent from the course pages on the public site. They sit above the student list because
// approving one is what adds a student to it: the two belong on the same screen.
export default function EnrollmentRequests({ onApproved }: { onApproved: () => void }) {
    const { message } = App.useApp();
    const [rows, setRows] = useState<EnrollmentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejecting, setRejecting] = useState<EnrollmentRequest>();
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<EnrollmentRequest[]>("/api/vh/backoffice/enrollment-requests?status=1") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const approve = async (row: EnrollmentRequest) => {
        setBusy(true);
        const res = await APIWithError(`/api/vh/backoffice/enrollment-requests/${row.requestid}/approve`, {
            data: {},
        });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Суралцагч бүртгэгдлээ");
        load();
        // The student list behind this panel now has one more row in it.
        onApproved();
    };

    const reject = async () => {
        if (!rejecting) return;
        setBusy(true);
        const res = await APIWithError(
            `/api/vh/backoffice/enrollment-requests/${rejecting.requestid}/reject`,
            { data: { note } },
        );
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setRejecting(undefined);
        setNote("");
        message.success("Хүсэлт татгалзсан");
        load();
    };

    if (!loading && rows.length === 0) return null;

    return (
        <>
            <Card
                title={<>Шинэ хүсэлт <Tag color="orange">{rows.length}</Tag></>}
                style={{ marginBottom: 16 }}
                styles={{ body: { padding: 0 } }}
            >
                <Table
                    rowKey="requestid"
                    loading={loading}
                    dataSource={rows}
                    pagination={false}
                    scroll={{ x: 760 }}
                    columns={[
                        {
                            title: "Нэр",
                            render: (_: unknown, r: EnrollmentRequest) =>
                                `${r.last_name} ${r.first_name}`.trim(),
                        },
                        { title: "Утас", dataIndex: "phone", width: 120, render: (v?: string) => v ?? "-" },
                        { title: "Сургалт", dataIndex: "groupname", width: 180 },
                        {
                            title: "Тайлбар",
                            dataIndex: "note",
                            render: (v?: string) => v || <span style={{ color: "#9AA3B0" }}>-</span>,
                        },
                        {
                            title: "Огноо",
                            dataIndex: "created",
                            width: 110,
                            render: (v: string) => dayjs(v).format("MM/DD HH:mm"),
                        },
                        {
                            title: "",
                            width: 190,
                            render: (_: unknown, r: EnrollmentRequest) => (
                                <div style={{ display: "flex", gap: 8 }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        icon={<Check size={14} />}
                                        loading={busy}
                                        onClick={() => approve(r)}
                                    >
                                        Батлах
                                    </Button>
                                    <Button
                                        size="small"
                                        danger
                                        icon={<X size={14} />}
                                        onClick={() => { setRejecting(r); setNote(""); }}
                                    >
                                        Татгалзах
                                    </Button>
                                </div>
                            ),
                        },
                    ]}
                />
            </Card>

            <Modal
                open={!!rejecting}
                onCancel={() => setRejecting(undefined)}
                onOk={reject}
                confirmLoading={busy}
                okText="Татгалзах"
                okButtonProps={{ danger: true }}
                cancelText="Болих"
                title="Хүсэлтийг татгалзах"
                destroyOnHidden
            >
                <p style={{ color: "#79808A", marginTop: 0 }}>
                    Шалтгааныг бичвэл хүсэлт илгээсэн хүнд харагдана.
                </p>
                <Input.TextArea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Шалтгаан (заавал биш)"
                />
            </Modal>
        </>
    );
}
