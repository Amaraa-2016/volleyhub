"use client";

import { Modal, InputNumber, Button, App, Typography } from "antd";
import { useEffect, useState } from "react";
import { APIWithError, errorText } from "@/app/utils/API";
import type { Match } from "@/app/types/api";

interface SetScore {
    home_points: number | null;
    away_points: number | null;
}

// Entering a result posts every set at once, so a correction is just a re-open and re-save. The
// backend validates the volleyball rules (25/15 points, two clear, sets needed to win) and owns the
// set counts - this form deliberately does not try to second-guess it.
export default function ResultModal({
    match,
    bestOf,
    onClose,
    onSaved,
}: {
    match?: Match;
    bestOf: number;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { message } = App.useApp();
    const [sets, setSets] = useState<SetScore[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!match) return;
        const existing: SetScore[] = match.sets.map((s) => ({
            home_points: s.home_points,
            away_points: s.away_points,
        }));
        // Start with the minimum number of sets a match can be won in.
        const minimum = Math.floor(bestOf / 2) + 1;
        while (existing.length < minimum) existing.push({ home_points: null, away_points: null });
        setSets(existing);
    }, [match, bestOf]);

    const update = (index: number, key: keyof SetScore, value: number | null) => {
        setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
    };

    const save = async () => {
        if (!match) return;
        const filled = sets.filter((s) => s.home_points !== null && s.away_points !== null);
        if (filled.length === 0) {
            message.error("Сетийн оноо оруулна уу");
            return;
        }

        setSaving(true);
        const res = await APIWithError(`/api/vh/backoffice/matches/${match.matchid}/result`, {
            data: {
                sets: filled.map((s, i) => ({
                    set_no: i + 1,
                    home_points: s.home_points,
                    away_points: s.away_points,
                })),
            },
        });
        setSaving(false);

        if (res.error) {
            message.error(errorText(res.error));
            return;
        }
        message.success("Үр дүн хадгалагдлаа");
        onSaved();
        onClose();
    };

    return (
        <Modal
            open={!!match}
            title="Тоглолтын үр дүн"
            onCancel={onClose}
            onOk={save}
            confirmLoading={saving}
            okText="Хадгалах"
            cancelText="Болих"
            destroyOnHidden
        >
            <Typography.Paragraph style={{ textAlign: "center", fontWeight: 600 }}>
                {match?.hometeamname} - {match?.awayteamname}
            </Typography.Paragraph>

            {sets.map((set, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{ width: 60, color: "#79808a" }}>{index + 1}-р сет</span>
                    <InputNumber
                        min={0}
                        max={99}
                        value={set.home_points}
                        onChange={(v) => update(index, "home_points", v)}
                        style={{ flex: 1 }}
                    />
                    <span>:</span>
                    <InputNumber
                        min={0}
                        max={99}
                        value={set.away_points}
                        onChange={(v) => update(index, "away_points", v)}
                        style={{ flex: 1 }}
                    />
                </div>
            ))}

            {sets.length < bestOf && (
                <Button
                    type="dashed"
                    block
                    onClick={() => setSets((prev) => [...prev, { home_points: null, away_points: null }])}
                >
                    Сет нэмэх
                </Button>
            )}
        </Modal>
    );
}
