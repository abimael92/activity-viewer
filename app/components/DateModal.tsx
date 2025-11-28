// components/DateModal.tsx
import { useEffect } from "react";
import "./RepoActivitySection.css";

type DateModalProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (date: string) => void;
};

export default function DateModal({ open, onClose, onSubmit }: DateModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const date = formData.get("date") as string;
        if (date) onSubmit(date);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <h2>Add Custom Date</h2>

                <form onSubmit={handleSubmit} className="modal-form">
                    <label>Choose a Date</label>
                    <input type="date" name="date" required />

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="cancel-btn">
                            Cancel
                        </button>
                        <button type="submit" className="submit-btn">
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
