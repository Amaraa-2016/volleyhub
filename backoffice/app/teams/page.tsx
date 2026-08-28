"use client";

import { Button, Form, Input, Modal, Select, Switch, Table, App, Popconfirm } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import type { Staff, Team } from "@/app/types/api";
import { GENDERS } from "@/app/types/api";

export default function TeamsPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const [rows, setRows] = useState<Team[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Team | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await API<Team[]>("/api/vh/backoffice/teams?includeInactive=true") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        API<Staff[]>("/api/vh/backoffice/staff").then((s) => setStaff(s ?? []));
    }, [load]);

    const openForm = (team: Team | null) => {
        setEditing(team);
        form.setFieldsValue(team ?? { gender: 1, isactive: true });
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await APIWithError("/api/vh/backoffice/teams", {
            data: { ...values, teamid: editing?.teamid ?? 0 },
        });

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        message.success("Хадгаллаа");
        load();
    };

    const remove = async (teamid: number) => {
        const res = await APIWithError(`/api/vh/backoffice/teams/${teamid}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Устгалаа");
        load();
    };

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Багууд</h1>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>
                    Баг нэмэх
                </Button>
            </div>

            <Table
                rowKey="teamid"
                loading={loading}
                dataSource={rows}
                onRow={(team) => ({ onClick: () => router.push(`/teams/${team.teamid}`) })}
                rowClassName={() => "clickable"}
                columns={[
                    { title: "Нэр", dataIndex: "name" },
                    { title: "Хүйс", dataIndex: "gender", render: (g: number) => GENDERS[g], width: 110 },
                    { title: "Насны ангилал", dataIndex: "agegroup", width: 140 },
                    { title: "Дивиз", dataIndex: "division", width: 120 },
                    { title: "Дасгалжуулагч", dataIndex: "coachname", width: 160 },
                    { title: "Тамирчид", dataIndex: "playercount", width: 100 },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, team: Team) => (
                            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(team)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(team.teamid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Баг засах" : "Шинэ баг"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="shortname" label="Товч нэр">
                        <Input />
                    </Form.Item>
                    <Form.Item name="gender" label="Хүйс">
                        <Select options={Object.entries(GENDERS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="agegroup" label="Насны ангилал">
                        <Input placeholder="U16, Насанд хүрэгчид" />
                    </Form.Item>
                    <Form.Item name="division" label="Дивиз">
                        <Input />
                    </Form.Item>
                    <Form.Item name="coach_staffid" label="Дасгалжуулагч">
                        <Select
                            allowClear
                            options={staff.map((s) => ({ value: s.staffid, label: s.staffname ?? s.phone }))}
                        />
                    </Form.Item>
                    <Form.Item name="notes" label="Тэмдэглэл">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="isactive" label="Идэвхтэй" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>

            <style jsx global>{`
                .clickable {
                    cursor: pointer;
                }
            `}</style>
        </AppShell>
    );
}
