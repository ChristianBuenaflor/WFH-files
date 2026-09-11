import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  ArrowCounterclockwise,
  ArrowClockwise,
  ListOl,
  ListUl,
  TypeBold,
  TypeItalic,
} from 'react-bootstrap-icons';
import '@/pages/attendance/components/richtexteditor/RichTextEditor.css';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="rich-text-toolbar" role="toolbar" aria-label="Formatting tools">
      <button
        type="button"
        className={`rich-text-tool ${editor.isActive('bold') ? 'is-active' : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
        title="Bold"
      >
        <TypeBold size={17} />
      </button>
      <button
        type="button"
        className={`rich-text-tool ${editor.isActive('italic') ? 'is-active' : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
        title="Italic"
      >
        <TypeItalic size={17} />
      </button>
      <button
        type="button"
        className={`rich-text-tool ${editor.isActive('bulletList') ? 'is-active' : ''}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
        title="Bullet list"
      >
        <ListUl size={17} />
      </button>
      <button
        type="button"
        className={`rich-text-tool ${editor.isActive('orderedList') ? 'is-active' : ''}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
        title="Numbered list"
      >
        <ListOl size={17} />
      </button>
      <button
        type="button"
        className="rich-text-tool rich-text-tool-spaced"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
        title="Undo"
      >
        <ArrowCounterclockwise size={17} />
      </button>
      <button
        type="button"
        className="rich-text-tool"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
        title="Redo"
      >
        <ArrowClockwise size={17} />
      </button>
    </div>
  );
};

const RichTextEditor = ({ value, onChange, placeholder, readOnly = false }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed || !editor.schema) return;
      onChange(editor.getHTML());
    },
    editable: !readOnly,
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.schema) return;

    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="rich-text-editor">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;