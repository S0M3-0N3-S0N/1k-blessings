import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";
import _ from "lodash";

export default function NotesCard() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const data = await base44.entities.SalonNote.list('-updated_date', 1);
    setNotes(data);
    if (data.length > 0) {
      setContent(data[0].content || '');
    }
    setLoaded(true);
  };

  const saveNote = useCallback(
    _.debounce(async (text) => {
      const existingNotes = await base44.entities.SalonNote.list('-updated_date', 1);
      if (existingNotes.length > 0) {
        await base44.entities.SalonNote.update(existingNotes[0].id, { content: text });
      } else {
        await base44.entities.SalonNote.create({ content: text });
      }
    }, 1000),
    []
  );

  const handleChange = (val) => {
    setContent(val);
    saveNote(val);
  };

  if (!loaded) return null;

  return (
    <div className="bg-card rounded-xl border border-border animate-fade-in">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Notes</h3>
      </div>
      <Textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder="Rental agreements, reminders, special arrangements…"
        className="border-0 rounded-none min-h-[120px] text-sm resize-none focus-visible:ring-0 px-5 py-4"
      />
    </div>
  );
}