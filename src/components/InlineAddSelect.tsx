import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = {
  value: string;
  label: string;
};

interface InlineAddSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  onAdd?: (name: string) => Promise<string | null>; // Returns new value or null on failure
  onEdit?: (value: string, newName: string) => Promise<boolean>;
  addLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function InlineAddSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  onAdd,
  onEdit,
  addLabel = 'Add new',
  className,
  disabled,
}: InlineAddSelectProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((isAdding || isEditing) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding, isEditing]);

  const handleAdd = async () => {
    if (!inputValue.trim() || !onAdd) return;
    setLoading(true);
    try {
      const newValue = await onAdd(inputValue.trim());
      if (newValue) {
        onValueChange(newValue);
      }
      setInputValue('');
      setIsAdding(false);
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!inputValue.trim() || !onEdit || !isEditing) return;
    setLoading(true);
    try {
      const success = await onEdit(isEditing, inputValue.trim());
      if (success) {
        setInputValue('');
        setIsEditing(null);
      }
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const cancelInline = () => {
    setIsAdding(false);
    setIsEditing(null);
    setInputValue('');
  };

  if (isAdding || isEditing) {
    return (
      <div className={cn('flex gap-1', className)}>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isAdding ? `New ${addLabel}...` : 'Rename...'}
          className="h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); isAdding ? handleAdd() : handleEdit(); }
            if (e.key === 'Escape') cancelInline();
          }}
          disabled={loading}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 flex-shrink-0"
          onClick={isAdding ? handleAdd : handleEdit}
          disabled={loading || !inputValue.trim()}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-primary" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-9 w-9 flex-shrink-0" onClick={cancelInline} disabled={loading}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1', className)}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center group">
              <SelectItem value={opt.value} className="flex-1">
                {opt.label}
              </SelectItem>
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mr-1 flex-shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(opt.value);
                    setInputValue(opt.label);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
          {onAdd && (
            <div className="p-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary hover:text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAdding(true);
                  setInputValue('');
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                {addLabel}
              </Button>
            </div>
          )}
        </SelectContent>
      </Select>
      {onAdd && (
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 flex-shrink-0"
          onClick={() => { setIsAdding(true); setInputValue(''); }}
          title={addLabel}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
