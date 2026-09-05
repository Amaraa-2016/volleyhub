"use client";

import { App, Button, Input, Modal } from "antd";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, UserPlus } from "lucide-react";
import { useAuthDialog } from "@/app/components/AuthDialog";
import { AccountAPI, AccountAPIWithError, errorText } from "@/app/utils/API";
import type { MyCourseRequest } from "@/app/types/api";

// Asking to join one course, from its page. Same shape as applying to run a centre: anyone may
// write the request, signing in is asked for at the send, and what they typed survives the dialog.
//
// The centre approves it in its console, which is what turns the applicant into a student - so what
// this shows afterwards is the state of that request, not a promise of a place.
export default function EnrollButton({
    tenantid,
    groupid,
    full,
}: {
    tenantid: number;
    groupid: number;
    // The course has no room left; asking is still allowed, the centre decides.
    full?: boolean;
}) {
    const { status } = useSession();
    const { message } = App.useApp();
    const openAuth = useAuthDialog();
    const [request, setRequest] = useState<MyCourseRequest | null>();
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (status !== "authenticated") { setRequest(null); return; }
        const path = `/api/vh/account/course/request?tenantid=${tenantid}&groupid=${groupid}`;
        setRequest(await AccountAPI<MyCourseRequest>(path) ?? null);
    }, [status, tenantid, groupid]);

    useEffect(() => { load(); }, [load]);

    const send = async (text: string) => {
        setBusy(true);
        const res = await AccountAPIWithError<MyCourseRequest>("/api/vh/account/course/request", {
            data: { tenantid, groupid, note: text },
        });
        setBusy(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        setOpen(false);
        setNote("");
        setRequest(res.data ?? null);
        message.success("Хүсэлт илгээгдлээ");
    };

    const submit = () => {
        if (status !== "authenticated") {
            // The note stays behind the dialog and goes out the moment they are signed in.
            const text = note;
            openAuth("login", () => send(text));
            return;
        }
        send(note);
    };

    if (status === "loading" || request === undefined) {
        return <Button block size="large" loading style={{ marginBottom: 16 }} />;
    }

    if (request?.status === 2) {
        return (
            <div className="enroll-state enroll-state--done">
                <CheckCircle2 size={17} />
                Та энэ сургалтад бүртгэгдсэн
            </div>
        );
    }

    if (request?.status === 1) {
        return (
            <div className="enroll-state">
                <Clock size={17} />
                Хүсэлт хүлээгдэж байна
            </div>
        );
    }

    return (
        <>
            {request?.status === 3 && (
                <div className="enroll-state enroll-state--no">
                    Өмнөх хүсэлт татгалзсан{request.decision_note ? `: ${request.decision_note}` : "."}
                </div>
            )}

            <Button
                block
                type="primary"
                size="large"
                icon={<UserPlus size={16} />}
                onClick={() => setOpen(true)}
                style={{ marginBottom: 16 }}
            >
                Сургалтад бүртгүүлэх
            </Button>

            <Modal
                open={open}
                onCancel={() => setOpen(false)}
                title="Сургалтад бүртгүүлэх"
                okText="Хүсэлт илгээх"
                cancelText="Болих"
                confirmLoading={busy}
                onOk={submit}
                destroyOnHidden
            >
                <p style={{ color: "#79808A", marginTop: 0 }}>
                    {full
                        ? "Сул орон дүүрсэн ч хүсэлт илгээх боломжтой - сургалтын төв хариу өгнө."
                        : "Хүсэлтийг сургалтын төв хүлээн авч, баталгаажуулна."}
                </p>
                <Input.TextArea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Хэн суралцах, өмнөх туршлага, тохирох цаг гэх мэт (заавал биш)"
                />
            </Modal>
        </>
    );
}
