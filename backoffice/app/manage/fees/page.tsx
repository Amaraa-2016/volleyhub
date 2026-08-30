"use client";

import { App, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Statistic, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import { ReceiptText, Wallet } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { API, APIWithError, errorText } from "@/app/utils/API";
import { FEE_STATUS, PAYMENT_METHODS, money, type Fee, type Group } from "@/app/types/api";

const STATUS_COLOR: Record<number, string> = { 1: "red", 2: "orange", 3: "green", 4: "default" };

export default function FeesPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Fee[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(dayjs().format("YYYY-MM"));
    const [groupFilter, setGroupFilter] = useState<number>();
    const [statusFilter, setStatusFilter] = useState<number>();
    const [paying, setPaying] = useState<Fee>();
    const [generateOpen, setGenerateOpen] = useState(false);
    const [payForm] = Form.useForm();
    const [generateForm] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        const query = new URLSearchParams({ period });
        if (groupFilter) query.set("groupid", String(groupFilter));
        if (statusFilter) query.set("status", String(statusFilter));
        setRows(await API<Fee[]>(`/api/vh/backoffice/fees?${query}`) ?? []);
        setLoading(false);
    }, [period, groupFilter, statusFilter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { API<Group[]>("/api/vh/backoffice/groups").then((g) => setGroups(g ?? [])); }, []);

    const generate = async () => {
        const { groupid, due_date } = await generateForm.validateFields();
        const res = await APIWithError<{ created: number; skipped: number }>("/api/vh/backoffice/fees/generate", {
            data: {
                groupid: groupid ?? null,
                period,
                due_date: due_date ? due_date.endOf("day").toISOString() : null,
            },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setGenerateOpen(false);
        message.success(`${res.data?.created ?? 0} төлбөр үүслээ`);
        load();
    };

    const openPay = (fee: Fee) => {
        payForm.resetFields();
        payForm.setFieldsValue({ amount: fee.balance, method: 1, paid_at: dayjs() });
        setPaying(fee);
    };

    const pay = async () => {
        if (!paying) return;
        const values = await payForm.validateFields();
        const res = await APIWithError("/api/vh/backoffice/payments", {
            data: {
                feeid: paying.feeid,
                amount: values.amount,
                method: values.method,
                paid_at: values.paid_at?.toISOString(),
                note: values.note,
            },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setPaying(undefined);
        message.success("Төлөлт бүртгэгдлээ");
        load();
    };

    const waive = async (fee: Fee) => {
        const res = await APIWithError(`/api/vh/backoffice/fees/${fee.feeid}/waive`, { data: {} });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    const total = rows.reduce((sum, f) => sum + f.amount, 0);
    const paid = rows.reduce((sum, f) => sum + f.paid_amount, 0);

    return (
        <AppShell>
            <div className="page-header">
                <h1 className="page-title">Төлбөр</h1>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <DatePicker
                        picker="month"
                        value={dayjs(period + "-01")}
                        allowClear={false}
                        format="YYYY-MM"
                        onChange={(v) => v && setPeriod(v.format("YYYY-MM"))}
                    />
                    <Select
                        allowClear
                        placeholder="Групп"
                        style={{ width: 170 }}
                        onChange={setGroupFilter}
                        options={groups.map((g) => ({ value: g.groupid, label: g.name }))}
                    />
                    <Select
                        allowClear
                        placeholder="Төлөв"
                        style={{ width: 150 }}
                        onChange={setStatusFilter}
                        options={Object.entries(FEE_STATUS).map(([v, l]) => ({ value: Number(v), label: l }))}
                    />
                    <Button type="primary" icon={<ReceiptText size={16} />} onClick={() => {
                        generateForm.setFieldsValue({ due_date: dayjs(period + "-10") });
                        setGenerateOpen(true);
                    }}>
                        Сарын төлбөр үүсгэх
                    </Button>
                </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <Card size="small" style={{ minWidth: 180 }}>
                    <Statistic title="Нийт төлбөр" value={money(total)} />
                </Card>
                <Card size="small" style={{ minWidth: 180 }}>
                    <Statistic title="Төлөгдсөн" value={money(paid)} valueStyle={{ color: "#1F9254" }} />
                </Card>
                <Card size="small" style={{ minWidth: 180 }}>
                    <Statistic
                        title="Үлдэгдэл"
                        value={money(total - paid)}
                        valueStyle={{ color: total - paid > 0 ? "#D93025" : undefined }}
                    />
                </Card>
            </div>

            <Table
                rowKey="feeid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 900 }}
                locale={{ emptyText: "Энэ сард төлбөр үүсээгүй байна" }}
                expandable={{
                    rowExpandable: (fee) => fee.payments.length > 0,
                    expandedRowRender: (fee) => (
                        <Table
                            size="small"
                            rowKey="paymentid"
                            pagination={false}
                            dataSource={fee.payments}
                            columns={[
                                {
                                    title: "Огноо",
                                    render: (_: unknown, p) => dayjs(p.paid_at).format("YYYY/MM/DD"),
                                },
                                { title: "Дүн", render: (_: unknown, p) => money(p.amount) },
                                { title: "Хэлбэр", render: (_: unknown, p) => PAYMENT_METHODS[p.method] },
                                { title: "Тэмдэглэл", dataIndex: "note" },
                            ]}
                        />
                    ),
                }}
                columns={[
                    {
                        title: "Суралцагч",
                        render: (_: unknown, f: Fee) => `${f.last_name} ${f.first_name}`.trim(),
                    },
                    { title: "Групп", dataIndex: "groupname", width: 150 },
                    { title: "Дүн", width: 120, render: (_: unknown, f: Fee) => money(f.amount) },
                    { title: "Төлсөн", width: 120, render: (_: unknown, f: Fee) => money(f.paid_amount) },
                    {
                        title: "Үлдэгдэл",
                        width: 120,
                        render: (_: unknown, f: Fee) =>
                            f.balance > 0 ? <b style={{ color: "#D93025" }}>{money(f.balance)}</b> : "-",
                    },
                    {
                        title: "Хугацаа",
                        width: 120,
                        render: (_: unknown, f: Fee) => (f.due_date ? dayjs(f.due_date).format("MM/DD") : "-"),
                    },
                    {
                        title: "Төлөв",
                        width: 130,
                        render: (_: unknown, f: Fee) => <Tag color={STATUS_COLOR[f.status]}>{FEE_STATUS[f.status]}</Tag>,
                    },
                    {
                        title: "",
                        width: 180,
                        render: (_: unknown, f: Fee) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<Wallet size={13} />}
                                    disabled={f.status === 3 || f.status === 4}
                                    onClick={() => openPay(f)}
                                >
                                    Төлөлт
                                </Button>
                                {f.status !== 4 && f.status !== 3 && (
                                    <Popconfirm title="Чөлөөлөх үү?" onConfirm={() => waive(f)}>
                                        <Button size="small">Чөлөөлөх</Button>
                                    </Popconfirm>
                                )}
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={!!paying}
                title="Төлөлт бүртгэх"
                onCancel={() => setPaying(undefined)}
                onOk={pay}
                okText="Бүртгэх"
                cancelText="Болих"
                destroyOnHidden
            >
                <p>
                    <b>{paying && `${paying.last_name} ${paying.first_name}`.trim()}</b> — {paying?.period} — үлдэгдэл{" "}
                    {money(paying?.balance)}
                </p>
                <Form form={payForm} layout="vertical" requiredMark={false}>
                    <Form.Item
                        name="amount"
                        label="Дүн (₮)"
                        rules={[{ required: true, message: "Дүн оруулна уу" }]}
                    >
                        <InputNumber min={1} max={paying?.balance} step={10000} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="method" label="Хэлбэр">
                        <Select options={Object.entries(PAYMENT_METHODS).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="paid_at" label="Огноо">
                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="note" label="Тэмдэглэл">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={generateOpen}
                title={`${period} сарын төлбөр үүсгэх`}
                onCancel={() => setGenerateOpen(false)}
                onOk={generate}
                okText="Үүсгэх"
                cancelText="Болих"
                destroyOnHidden
            >
                <p style={{ color: "#79808A" }}>
                    Идэвхтэй бүртгэлтэй суралцагч бүрт тохирсон үнээр нь төлбөр үүсгэнэ. Аль хэдийн
                    төлбөртэй болсон суралцагчийг алгасах тул дахин ажиллуулахад давхардахгүй.
                </p>
                <Form form={generateForm} layout="vertical" requiredMark={false}>
                    <Form.Item name="groupid" label="Групп" tooltip="Хоосон бол бүх групп">
                        <Select allowClear options={groups.map((g) => ({ value: g.groupid, label: g.name }))} />
                    </Form.Item>
                    <Form.Item name="due_date" label="Төлөх эцсийн хугацаа">
                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                    </Form.Item>
                </Form>
            </Modal>
        </AppShell>
    );
}
