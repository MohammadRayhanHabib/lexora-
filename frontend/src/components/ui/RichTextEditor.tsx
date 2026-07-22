import React, { useRef, useEffect } from "react";
import { clsx } from "clsx";
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
} from "react-icons/fi";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeight = "300px",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync external value → DOM (only on mount or when value changes from outside)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const toolbarBtn =
    "p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors";

  return (
    <div
      className={clsx(
        "border border-gray-300 rounded-lg overflow-hidden",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("bold");
          }}
          title="Bold"
        >
          <FiBold className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("italic");
          }}
          title="Italic"
        >
          <FiItalic className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("underline");
          }}
          title="Underline"
        >
          <FiUnderline className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("justifyLeft");
          }}
          title="Align Left"
        >
          <FiAlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("justifyCenter");
          }}
          title="Align Center"
        >
          <FiAlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("justifyRight");
          }}
          title="Align Right"
        >
          <FiAlignRight className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
          title="Bullet List"
        >
          &#8226;
        </button>
        <button
          type="button"
          className={toolbarBtn}
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertOrderedList");
          }}
          title="Numbered List"
        >
          1.
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <select
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
          onChange={(e) => {
            exec("formatBlock", e.target.value);
            e.target.value = "";
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Heading
          </option>
          <option value="p">Paragraph</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
      </div>

      {/* Editable content area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className={clsx(
          "p-4 text-gray-900 text-sm leading-relaxed focus:outline-none",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400",
        )}
        style={{ minHeight }}
      />
    </div>
  );
};

export default RichTextEditor;
