"use client";

import { App, Button, Upload } from "antd";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { errorText } from "@/app/utils/API";

type Scope = "training" | "platform";

interface UploadResult {
    url: string;
    size: number;
}

async function upload(file: File, scope: Scope, folder?: string): Promise<string> {
    const body = new FormData();
    body.append("file", file);

    const query = new URLSearchParams({ scope });
    if (folder) query.set("folder", folder);

    const res = await fetch(`/api/ui/upload?${query}`, { method: "POST", body });
    const text = await res.text();

    if (!res.ok) {
        let code = "server_error";
        try { code = (JSON.parse(text) as { error?: string }).error ?? code; } catch { /* non-JSON */ }
        throw new Error(code);
    }
    return (JSON.parse(text) as UploadResult).url;
}

// Antd's Upload wants to own the request; we hand it our own so the file goes through the Next
// proxy that holds the token. Form.Item drives `value`/`onChange`, so both components below store
// plain strings - a URL, or a comma-separated list - exactly as the backend stores them.
export function ImageUpload({
    value,
    onChange,
    scope = "training",
    folder,
    height = 140,
}: {
    value?: string | null;
    onChange?: (value: string | undefined) => void;
    scope?: Scope;
    folder?: string;
    height?: number;
}) {
    const { message } = App.useApp();
    const [busy, setBusy] = useState(false);

    return (
        <div>
            {value ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                    <img
                        src={value}
                        alt=""
                        style={{ height, maxWidth: 320, objectFit: "cover", borderRadius: 8, display: "block" }}
                    />
                    <Button
                        size="small"
                        danger
                        icon={<Trash2 size={13} />}
                        onClick={() => onChange?.(undefined)}
                        style={{ position: "absolute", top: 6, right: 6 }}
                    />
                </div>
            ) : (
                <Upload
                    accept="image/*"
                    showUploadList={false}
                    customRequest={async ({ file }) => {
                        setBusy(true);
                        try {
                            onChange?.(await upload(file as File, scope, folder));
                        } catch (e) {
                            message.error(errorText((e as Error).message));
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <Button icon={<ImagePlus size={15} />} loading={busy}>Зураг оруулах</Button>
                </Upload>
            )}
        </div>
    );
}

// Several images as one comma-separated string, which is how the backend keeps galleries.
export function MultiImageUpload({
    value,
    onChange,
    scope = "training",
    folder,
    max = 10,
}: {
    value?: string | null;
    onChange?: (value: string | undefined) => void;
    scope?: Scope;
    folder?: string;
    max?: number;
}) {
    const { message } = App.useApp();
    const [busy, setBusy] = useState(false);

    const urls = useMemo(
        () => (value ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        [value],
    );

    // Antd fires customRequest once per file, and picking several at once means every call reads
    // the same render's `value` - so appending to it would keep only the last upload. The ref holds
    // what has actually been committed, which each upload can append to in turn.
    const latest = useRef<string[]>(urls);
    useEffect(() => { latest.current = urls; }, [urls]);

    const commit = (next: string[]) => {
        latest.current = next;
        onChange?.(next.length ? next.join(", ") : undefined);
    };

    return (
        <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: urls.length ? 10 : 0 }}>
                {urls.map((src, index) => (
                    <div key={`${src}-${index}`} style={{ position: "relative" }}>
                        <img
                            src={src}
                            alt=""
                            style={{ width: 110, height: 84, objectFit: "cover", borderRadius: 8, display: "block" }}
                        />
                        <Button
                            size="small"
                            danger
                            icon={<Trash2 size={12} />}
                            onClick={() => commit(urls.filter((_, i) => i !== index))}
                            style={{ position: "absolute", top: 4, right: 4 }}
                        />
                    </div>
                ))}
            </div>

            {urls.length < max && (
                <Upload
                    accept="image/*"
                    multiple
                    showUploadList={false}
                    customRequest={async ({ file }) => {
                        setBusy(true);
                        try {
                            const url = await upload(file as File, scope, folder);
                            commit([...latest.current, url]);
                        } catch (e) {
                            message.error(errorText((e as Error).message));
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <Button icon={<ImagePlus size={15} />} loading={busy}>Зураг нэмэх</Button>
                </Upload>
            )}
        </div>
    );
}
