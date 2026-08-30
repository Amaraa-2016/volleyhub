"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { App, Button, Card, Form, Input, InputNumber, Result, Skeleton, Tag } from "antd";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
import SiteShell from "@/app/components/SiteShell";
import { PublicAPIWithError, PublicAPI, errorText } from "@/app/utils/API";
import { money, type Product } from "@/app/types/api";

interface OrderValues {
    customer_name: string;
    phone: string;
    address?: string;
    note?: string;
    quantity: number;
}

// Catalogue plus an enquiry form: no cart and no online payment by design - the order leaves a
// name and a number, and the shop calls back.
export default function ProductPage() {
    const params = useParams<{ id: string }>();
    const { data: session } = useSession();
    const { message } = App.useApp();
    const [product, setProduct] = useState<Product | null>();
    const [placed, setPlaced] = useState(false);
    const [busy, setBusy] = useState(false);
    const [form] = Form.useForm<OrderValues>();

    useEffect(() => {
        PublicAPI<Product>(`/api/vh/public/products/${params.id}`).then((p) => setProduct(p ?? null));
    }, [params.id]);

    // Prefill from the session when there is one; the form still works signed out.
    useEffect(() => {
        if (session?.name || session?.phone) {
            form.setFieldsValue({ customer_name: session.name ?? "", phone: session.phone ?? "" });
        }
    }, [session, form]);

    const submit = async (values: OrderValues) => {
        if (!product) return;
        setBusy(true);
        const res = await PublicAPIWithError("/api/vh/public/orders", {
            data: {
                customer_name: values.customer_name,
                phone: values.phone,
                address: values.address,
                note: values.note,
                items: [{ productid: product.productid, quantity: values.quantity || 1 }],
            },
        });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setPlaced(true);
    };

    if (product === undefined) {
        return (
            <SiteShell>
                <div className="site-container" style={{ padding: "48px 20px" }}><Skeleton active /></div>
            </SiteShell>
        );
    }

    if (product === null) {
        return (
            <SiteShell>
                <div className="site-empty">Бараа олдсонгүй.</div>
            </SiteShell>
        );
    }

    return (
        <SiteShell>
            <section className="site-section">
                <div className="site-container">
                    <Link href="/shop">
                        <Button type="text" icon={<ArrowLeft size={16} />} style={{ marginBottom: 16 }}>
                            Дэлгүүр рүү буцах
                        </Button>
                    </Link>

                    <div style={{ display: "grid", gap: 28, gridTemplateColumns: "minmax(0,1fr) minmax(280px,1fr)" }}>
                        <div>
                            <div className="site-card__media" style={{ borderRadius: 14, overflow: "hidden" }}>
                                {product.images[0]
                                    ? <img src={product.images[0]} alt={product.name} />
                                    : <ShoppingBag size={40} />}
                            </div>
                            {product.images.length > 1 && (
                                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                                    {product.images.slice(1).map((src, i) => (
                                        <img key={i} src={src} alt="" style={{ width: 90, height: 70, objectFit: "cover", borderRadius: 8 }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h1 style={{ fontSize: 26, margin: "0 0 6px", letterSpacing: -0.5 }}>{product.name}</h1>
                            <div className="site-card__meta" style={{ marginBottom: 12 }}>
                                {[product.brand, product.category].filter(Boolean).join(" · ")}
                            </div>

                            <div style={{ fontSize: 26, fontWeight: 800, color: "#F26522", marginBottom: 6 }}>
                                {money(product.price)}
                                {!!product.old_price && (
                                    <span style={{ marginLeft: 10, fontSize: 16, color: "#9AA3B0", textDecoration: "line-through", fontWeight: 400 }}>
                                        {money(product.old_price)}
                                    </span>
                                )}
                            </div>

                            {product.stock > 0
                                ? <Tag color="green">Нөөцөд {product.stock}</Tag>
                                : <Tag color="red">Дууссан</Tag>}

                            {!!product.description && (
                                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginTop: 16 }}>
                                    {product.description}
                                </p>
                            )}

                            <Card title="Захиалгын хүсэлт" style={{ marginTop: 20 }}>
                                {placed ? (
                                    <Result
                                        status="success"
                                        title="Хүсэлт хүлээн авлаа"
                                        subTitle="Бид таны үлдээсэн дугаараар удахгүй холбогдоно."
                                        extra={<Link href="/shop"><Button>Үргэлжлүүлэн үзэх</Button></Link>}
                                    />
                                ) : (
                                    <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}
                                        initialValues={{ quantity: 1 }}>
                                        <Form.Item name="customer_name" label="Нэр" rules={[{ required: true, message: "Нэрээ оруулна уу" }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="phone" label="Утас" rules={[{ required: true, message: "Утасны дугаараа оруулна уу" }]}>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="quantity" label="Тоо ширхэг">
                                            <InputNumber min={1} max={99} style={{ width: "100%" }} />
                                        </Form.Item>
                                        <Form.Item name="address" label="Хүргэлтийн хаяг">
                                            <Input />
                                        </Form.Item>
                                        <Form.Item name="note" label="Нэмэлт тайлбар">
                                            <Input.TextArea rows={2} />
                                        </Form.Item>
                                        <Button type="primary" htmlType="submit" loading={busy} block size="large">
                                            Захиалах
                                        </Button>
                                        <div style={{ color: "#79808A", fontSize: 12, marginTop: 10, textAlign: "center" }}>
                                            Онлайн төлбөр авахгүй — бид утсаар холбогдож баталгаажуулна.
                                        </div>
                                    </Form>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        </SiteShell>
    );
}
