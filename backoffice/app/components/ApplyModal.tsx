"use client";

import { Modal } from "antd";
import ApplyForm from "@/app/components/ApplyForm";
import Wordmark from "@/app/components/Wordmark";

// The same application form the home page carries as a section, for the buttons in the header and
// the hero: someone who clicked one of those has asked for the form now and should not have to hunt
// for it down the page.
export default function ApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={560}
            title={<>Сургалтаа <Wordmark /> дээр бүртгүүлэх</>}
            destroyOnHidden
        >
            <ApplyForm active={open} onDone={onClose} />
        </Modal>
    );
}
