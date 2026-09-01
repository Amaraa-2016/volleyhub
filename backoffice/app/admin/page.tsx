"use client";

import { App, Button, Form, Input, InputNumber, Layout, Modal, Popconfirm, Select, Switch, Table, Tabs, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { LogOut, Plus, Volleyball } from "lucide-react";
import { AccountAPI, AccountAPIWithError, errorText } from "@/app/utils/API";
import Wordmark from "@/app/components/Wordmark";
import { ImageUpload, MultiImageUpload } from "@/app/components/ImageUpload";
import {
    NEWS_CATEGORIES, ORDER_STATUS, money,
    type ClubSearchResult, type News, type Order, type Product, type TenantRequest,
} from "@/app/types/api";

const { Header, Content } = Layout;

// Platform console. Cross-centre, so it renders outside AppShell (which assumes a selected centre)
// and talks to /api/vh/platform/* through the account proxy.
export default function AdminPage() {
    const router = useRouter();

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header
                style={{
                    background: "#141922", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "0 20px",
                }}
            >
                <div style={{ color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <Volleyball size={20} color="#F26522" />
                    <Wordmark /> — Платформ
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button type="text" style={{ color: "#fff" }} onClick={() => router.push("/")}>Сайт</Button>
                    <Button type="text" style={{ color: "#fff" }} onClick={() => router.push("/club")}>Сургалт</Button>
                    <Button
                        type="text"
                        style={{ color: "#fff" }}
                        icon={<LogOut size={14} />}
                        onClick={() => signOut({ callbackUrl: "/login" })}
                    >
                        Гарах
                    </Button>
                </div>
            </Header>
            <Content style={{ padding: 20 }}>
                <Tabs
                    items={[
                        { key: "requests", label: "Бүртгүүлэх хүсэлт", children: <RequestsTab /> },
                        { key: "trainings", label: "Сургалтууд", children: <TrainingsTab /> },
                        { key: "news", label: "Мэдээ", children: <NewsTab /> },
                        { key: "products", label: "Дэлгүүр", children: <ProductsTab /> },
                        { key: "orders", label: "Захиалга", children: <OrdersTab /> },
                    ]}
                />
            </Content>
        </Layout>
    );
}

// ---- training-centre applications -----------------------------------------

function RequestsTab() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<TenantRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewing, setReviewing] = useState<{ request: TenantRequest; approve: boolean } | null>(null);
    const [note, setNote] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await AccountAPI<TenantRequest[]>("/api/vh/platform/requests") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const review = async () => {
        if (!reviewing) return;
        const action = reviewing.approve ? "approve" : "reject";
        const res = await AccountAPIWithError(
            `/api/vh/platform/requests/${reviewing.request.tenantrequestid}/${action}`,
            { data: { note } },
        );
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success(reviewing.approve ? "Сургалт үүслээ" : "Татгалзлаа");
        setReviewing(null);
        setNote("");
        load();
    };

    return (
        <>
            <Table
                rowKey="tenantrequestid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 900 }}
                columns={[
                    { title: "Сургалт", dataIndex: "tenantname" },
                    { title: "Хүсэлт гаргагч", dataIndex: "applicantname" },
                    { title: "Утас", dataIndex: "applicantphone", width: 130 },
                    { title: "Хаяг", dataIndex: "address" },
                    {
                        title: "Огноо",
                        dataIndex: "created",
                        width: 130,
                        render: (v: string) => dayjs(v).format("YYYY/MM/DD"),
                    },
                    {
                        title: "Төлөв",
                        dataIndex: "status",
                        width: 140,
                        render: (s: string) => (
                            <Tag color={s === "approved" ? "green" : s === "rejected" ? "red" : "orange"}>
                                {s === "approved" ? "Батлагдсан" : s === "rejected" ? "Татгалзсан" : "Хүлээгдэж буй"}
                            </Tag>
                        ),
                    },
                    {
                        title: "",
                        width: 190,
                        render: (_: unknown, r: TenantRequest) =>
                            r.status === "pending" && (
                                <div style={{ display: "flex", gap: 8 }}>
                                    <Button size="small" type="primary" onClick={() => setReviewing({ request: r, approve: true })}>
                                        Батлах
                                    </Button>
                                    <Button size="small" danger onClick={() => setReviewing({ request: r, approve: false })}>
                                        Татгалзах
                                    </Button>
                                </div>
                            ),
                    },
                ]}
            />

            <Modal
                open={!!reviewing}
                title={reviewing?.approve ? "Сургалт батлах" : "Хүсэлт татгалзах"}
                onCancel={() => setReviewing(null)}
                onOk={review}
                okText={reviewing?.approve ? "Батлах" : "Татгалзах"}
                cancelText="Болих"
            >
                <p><b>{reviewing?.request.tenantname}</b> — {reviewing?.request.applicantname}</p>
                {reviewing?.approve && (
                    <p style={{ color: "#79808a" }}>
                        Батласнаар сургалтын schema үүсч, хүсэлт гаргагч эзэмшигч эрхтэй болно.
                    </p>
                )}
                <Input.TextArea rows={3} placeholder="Тайлбар (заавал биш)" value={note} onChange={(e) => setNote(e.target.value)} />
            </Modal>
        </>
    );
}

function TrainingsTab() {
    const [rows, setRows] = useState<ClubSearchResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AccountAPI<ClubSearchResult[]>("/api/vh/platform/tenants")
            .then((r) => setRows(r ?? []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Table
            rowKey="tenantid"
            loading={loading}
            dataSource={rows}
            columns={[
                { title: "ID", dataIndex: "tenantid", width: 80 },
                { title: "Нэр", dataIndex: "tenantname" },
                { title: "Хаяг", dataIndex: "address" },
            ]}
        />
    );
}

// ---- news -----------------------------------------------------------------

function NewsTab() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<News[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<News | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await AccountAPI<News[]>("/api/vh/platform/news") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // The listing omits the body, so editing an existing item has to fetch the detail first.
    const openForm = async (post: News | null) => {
        if (post) {
            const full = await AccountAPI<News>(`/api/vh/platform/news/${post.newsid}`);
            setEditing(post);
            form.setFieldsValue({ ...(full ?? post), publish: !!post.published_at });
        } else {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({ category: 2, publish: true });
        }
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await AccountAPIWithError("/api/vh/platform/news", {
            data: { ...values, newsid: editing?.newsid ?? 0 },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        message.success("Хадгаллаа");
        load();
    };

    const remove = async (id: number) => {
        const res = await AccountAPIWithError(`/api/vh/platform/news/${id}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    return (
        <>
            <div style={{ marginBottom: 12 }}>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>Мэдээ нэмэх</Button>
            </div>

            <Table
                rowKey="newsid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 800 }}
                columns={[
                    { title: "Гарчиг", dataIndex: "title" },
                    {
                        title: "Ангилал",
                        dataIndex: "category",
                        width: 120,
                        render: (c: number) => NEWS_CATEGORIES[c],
                    },
                    {
                        title: "Нийтэлсэн",
                        width: 150,
                        render: (_: unknown, n: News) =>
                            n.published_at ? dayjs(n.published_at).format("YYYY/MM/DD HH:mm") : <Tag>Ноорог</Tag>,
                    },
                    { title: "Үзсэн", dataIndex: "view_count", width: 90 },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, n: News) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(n)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(n.newsid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Мэдээ засах" : "Шинэ мэдээ"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                width={720}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="title" label="Гарчиг" rules={[{ required: true, message: "Гарчиг оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" label="Ангилал">
                        <Select options={Object.entries(NEWS_CATEGORIES).map(([v, l]) => ({ value: Number(v), label: l }))} />
                    </Form.Item>
                    <Form.Item name="summary" label="Товч утга" tooltip="Жагсаалтад гарчгийн доор харагдана">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="body" label="Агуулга">
                        <Input.TextArea rows={10} />
                    </Form.Item>
                    <Form.Item name="cover" label="Ковер зураг">
                        <ImageUpload scope="platform" folder="news" height={160} />
                    </Form.Item>
                    <Form.Item name="source" label="Эх сурвалж">
                        <Input placeholder="FIVB, Монголын волейболын холбоо..." />
                    </Form.Item>
                    <Form.Item name="source_url" label="Эх сурвалжийн холбоос">
                        <Input placeholder="https://" />
                    </Form.Item>
                    <Form.Item name="publish" label="Нийтлэх" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

// ---- shop -----------------------------------------------------------------

function ProductsTab() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Product | null>(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await AccountAPI<Product[]>("/api/vh/platform/products") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openForm = (product: Product | null) => {
        setEditing(product);
        form.resetFields();
        form.setFieldsValue(
            product
                // images arrive as an array and are stored as a comma-separated string.
                ? { ...product, images: product.images.join(", ") }
                : { isactive: true, stock: 0, sort_order: 0, price: 0 },
        );
        setOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();
        const res = await AccountAPIWithError("/api/vh/platform/products", {
            data: { ...values, productid: editing?.productid ?? 0 },
        });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        message.success("Хадгаллаа");
        load();
    };

    const remove = async (id: number) => {
        const res = await AccountAPIWithError(`/api/vh/platform/products/${id}`, { method: "DELETE" });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    return (
        <>
            <div style={{ marginBottom: 12 }}>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => openForm(null)}>Бараа нэмэх</Button>
            </div>

            <Table
                rowKey="productid"
                loading={loading}
                dataSource={rows}
                scroll={{ x: 900 }}
                columns={[
                    { title: "Нэр", dataIndex: "name" },
                    { title: "Ангилал", dataIndex: "category", width: 130 },
                    { title: "Брэнд", dataIndex: "brand", width: 130 },
                    { title: "Үнэ", width: 120, render: (_: unknown, p: Product) => money(p.price) },
                    { title: "Нөөц", dataIndex: "stock", width: 90 },
                    {
                        title: "Төлөв",
                        width: 110,
                        render: (_: unknown, p: Product) =>
                            p.isactive ? <Tag color="green">Идэвхтэй</Tag> : <Tag>Идэвхгүй</Tag>,
                    },
                    {
                        title: "",
                        width: 150,
                        render: (_: unknown, p: Product) => (
                            <div style={{ display: "flex", gap: 8 }}>
                                <Button size="small" onClick={() => openForm(p)}>Засах</Button>
                                <Popconfirm title="Устгах уу?" onConfirm={() => remove(p.productid)}>
                                    <Button size="small" danger>Устгах</Button>
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
            />

            <Modal
                open={open}
                title={editing ? "Бараа засах" : "Шинэ бараа"}
                onCancel={() => setOpen(false)}
                onOk={save}
                okText="Хадгалах"
                cancelText="Болих"
                width={640}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Нэр" rules={[{ required: true, message: "Нэр оруулна уу" }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="category" label="Ангилал">
                        <Input placeholder="Бөмбөг, Хамгаалалт, Гутал..." />
                    </Form.Item>
                    <Form.Item name="brand" label="Брэнд">
                        <Input placeholder="Mikasa, Molten..." />
                    </Form.Item>
                    <Form.Item name="description" label="Тайлбар">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                    <Form.Item name="price" label="Үнэ (₮)" rules={[{ required: true, message: "Үнэ оруулна уу" }]}>
                        <InputNumber min={0} step={1000} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="old_price" label="Хуучин үнэ (₮)" tooltip="Хямдралтай үед харуулна">
                        <InputNumber min={0} step={1000} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="images" label="Зураг" tooltip="Эхний зураг нь жагсаалтад харагдана">
                        <MultiImageUpload scope="platform" folder="products" max={8} />
                    </Form.Item>
                    <Form.Item name="stock" label="Нөөц">
                        <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="sort_order" label="Эрэмбэ">
                        <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="isactive" label="Идэвхтэй" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

function OrdersTab() {
    const { message } = App.useApp();
    const [rows, setRows] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setRows(await AccountAPI<Order[]>("/api/vh/platform/orders") ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const setStatus = async (orderid: number, status: number) => {
        const res = await AccountAPIWithError(`/api/vh/platform/orders/${orderid}/status`, { data: { status } });
        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        load();
    };

    return (
        <Table
            rowKey="orderid"
            loading={loading}
            dataSource={rows}
            scroll={{ x: 900 }}
            expandable={{
                expandedRowRender: (order) => (
                    <Table
                        size="small"
                        rowKey="orderitemid"
                        pagination={false}
                        dataSource={order.items}
                        columns={[
                            { title: "Бараа", dataIndex: "product_name" },
                            { title: "Үнэ", render: (_: unknown, i) => money(i.price) },
                            { title: "Тоо", dataIndex: "quantity", width: 80 },
                            { title: "Дүн", render: (_: unknown, i) => money(i.price * i.quantity) },
                        ]}
                    />
                ),
            }}
            columns={[
                {
                    title: "Огноо",
                    width: 150,
                    render: (_: unknown, o: Order) => dayjs(o.created).format("YYYY/MM/DD HH:mm"),
                },
                { title: "Захиалагч", dataIndex: "customer_name" },
                { title: "Утас", dataIndex: "phone", width: 130 },
                { title: "Хаяг", dataIndex: "address" },
                { title: "Дүн", width: 120, render: (_: unknown, o: Order) => <b>{money(o.total)}</b> },
                {
                    title: "Төлөв",
                    width: 170,
                    render: (_: unknown, o: Order) => (
                        <Select
                            size="small"
                            style={{ width: 150 }}
                            value={o.status}
                            options={Object.entries(ORDER_STATUS).map(([v, l]) => ({ value: Number(v), label: l }))}
                            onChange={(v) => setStatus(o.orderid, v)}
                        />
                    ),
                },
            ]}
        />
    );
}
