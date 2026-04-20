import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { acceptTicket, addTicketNote, TicketStatus, updateTicketStatus, uploadTicketImages } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  ticketId: string;
  currentStatus: TicketStatus;
};

const TicketActions = ({ ticketId, currentStatus }: Props) => {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<TicketStatus>(currentStatus);

  const acceptMut = useMutation({
    mutationFn: () => acceptTicket(ticketId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-detail"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const statusMut = useMutation({
    mutationFn: (s: TicketStatus) => updateTicketStatus(ticketId, s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-detail"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const noteMut = useMutation({
    mutationFn: (n: string) => addTicketNote(ticketId, n),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["ticket-detail"] });
    },
  });

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => uploadTicketImages(ticketId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-detail"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending || currentStatus !== "assigned"}>
          {acceptMut.isPending ? "Đang tiếp nhận..." : "Tiếp nhận công việc"}
        </Button>
        <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="assigned">Tiếp nhận</SelectItem>
            <SelectItem value="in-progress">Đang thực hiện</SelectItem>
            <SelectItem value="completed">Đã hoàn thành</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => statusMut.mutate(status)} disabled={statusMut.isPending}>
          {statusMut.isPending ? "Đang cập nhật..." : "Cập nhật trạng thái"}
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thêm ghi chú..." />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => note && noteMut.mutate(note)} disabled={!note || noteMut.isPending}>
            {noteMut.isPending ? "Đang lưu..." : "Lưu ghi chú"}
          </Button>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length) uploadMut.mutate(files);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketActions;


