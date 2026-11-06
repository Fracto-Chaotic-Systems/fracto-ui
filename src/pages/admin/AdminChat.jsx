import {
  AssistantRuntimeProvider,
  AuiIf,
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useAuiState,
  useAuiEvent,
} from "@assistant-ui/react";
import styled from "styled-components";
import { useEffect, useMemo, useState } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";
import MarkdownDocument from "../../utils/ui/MarkdownDocument.jsx";
import { prepare_chat_messages } from "./chat_messages.js";
import {
  create_chat_attachment_adapter,
  CHAT_FILE_COUNT,
} from "./chat_attachments.js";
import {
  KEY_ADMIN_CHAT_TITLE,
  KEY_ADMIN_CHAT_STATUS,
  KEY_ADMIN_CHAT_MODE,
  KEY_ADMIN_CHAT_GENERAL,
  KEY_ADMIN_CHAT_REFERENCE,
  KEY_ADMIN_CHAT_REFERENCE_NOTE,
  KEY_ADMIN_CHAT_MODE_NOTE,
  KEY_ADMIN_CHAT_EMPTY_TITLE,
  KEY_ADMIN_CHAT_EMPTY_NOTE,
  KEY_ADMIN_CHAT_PLACEHOLDER,
  KEY_ADMIN_CHAT_ATTACH,
  KEY_ADMIN_CHAT_REMOVE,
  KEY_ADMIN_CHAT_SEND,
  KEY_ADMIN_CHAT_STOP,
  KEY_ADMIN_CHAT_WORKING,
  KEY_ADMIN_CHAT_ERROR,
  KEY_ADMIN_CHAT_FILES_NOTE,
  KEY_ADMIN_CHAT_FILE_ERRORS,
  KEY_ADMIN_CHAT_RESPONSE_ERRORS,
} from "../../text/AdminText.jsx";

const model_adapter = (mode) => ({
  async *run({ messages, abortSignal }) {
    for await (const text of AdminBackend.chat_stream(
      prepare_chat_messages(messages, mode),
      abortSignal,
      mode,
    )) {
      yield { content: [{ type: "text", text }] };
    }
  },
});

const ChatLayout = styled.div`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .chat-thread {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
  }

  .chat-status {
    margin: 1rem 1.25rem 0;
    padding: 0.75rem 1rem;
    border: 1px solid #d7dfe7;
    border-radius: 0.5rem;
    background: #f1f5f8;
    color: #526575;
    font-size: 0.875rem;
  }

  .chat-viewport {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1.25rem;
  }

  .chat-empty {
    padding: 2rem 0;
    text-align: center;
    color: #687580;
  }

  .chat-empty h2 {
    font-size: 1.25rem;
    color: #444;
  }
  .chat-empty p {
    line-height: 1.5;
  }

  .chat-message {
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: #f0f3f5;
    overflow-wrap: anywhere;
  }

  .chat-composer {
    margin: 0 1.25rem 1.25rem;
    padding: 0.75rem;
    border: 1px solid #bbc7d1;
    border-radius: 0.75rem;
    background: white;
  }

  .chat-composer:focus-within {
    outline: 2px solid #779ab7;
  }

  .chat-input {
    box-sizing: border-box;
    display: block;
    width: 100%;
    min-height: 5rem;
    max-height: 12rem;
    resize: vertical;
    border: none;
    outline: none;
    padding: 0.5rem;
    font: inherit;
    color: inherit;
    background: transparent;
  }

  .chat-actions {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }
  button {
    border: 1px solid #bbc7d1;
    border-radius: 0.375rem;
    padding: 0.5rem 0.875rem;
    background: #f6f8fa;
    color: #344c60;
    font: inherit;
    cursor: pointer;
  }
  button:hover:enabled {
    background: #e9eff4;
  }
  button:focus-visible {
    outline: 2px solid #557f9f;
    outline-offset: 2px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-attachment {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border: 1px solid #d7dfe7;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  .chat-attachment span {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

function ChatAttachment() {
  return (
    <AttachmentPrimitive.Root className="chat-attachment">
      <span>
        <AttachmentPrimitive.Name />
      </span>
      <AttachmentPrimitive.Remove
        type="button"
        aria-label={AppText.get(KEY_ADMIN_CHAT_REMOVE)}
      >
        {AppText.get(KEY_ADMIN_CHAT_REMOVE)}
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
}

function ChatMessage() {
  return (
    <MessagePrimitive.Root className="chat-message">
      <MessagePrimitive.Attachments>
        {() => (
          <AttachmentPrimitive.Root className="chat-attachment">
            <AttachmentPrimitive.Name />
          </AttachmentPrimitive.Root>
        )}
      </MessagePrimitive.Attachments>
      <MessagePrimitive.Parts components={{ Text: ChatText }} />
      <MessagePrimitive.Error>
        <ChatResponseError />
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

function ChatResponseError() {
  const error = useAuiState((state) => state.message.status.error);
  const code = typeof error === "string" ? error : error?.message;
  const messages = AppText.get(KEY_ADMIN_CHAT_RESPONSE_ERRORS);
  return (
    <p role="alert">{messages[code] || AppText.get(KEY_ADMIN_CHAT_ERROR)}</p>
  );
}

function ChatText() {
  const text = useAuiState((state) =>
    state.part.type === "text" ? state.part.text : "",
  );
  return <MarkdownDocument external_links>{text}</MarkdownDocument>;
}

function ChatComposer({ file_error, set_file_error, mode }) {
  useAuiEvent("composer.attachmentAddError", ({ message, reason }) => {
    set_file_error(
      (message.startsWith("CHAT_") ? message : null) ||
        (reason === "not-accepted" ? "CHAT_FILE_TYPE" : "CHAT_FILE_READ"),
    );
  });
  const draft = useAuiState((state) => state.composer);
  let draft_error = null;
  if (draft.text.trim() || draft.attachments.length) {
    try {
      prepare_chat_messages(
        [
          {
            role: "user",
            content: [{ type: "text", text: draft.text }],
            attachments: draft.attachments,
          },
        ],
        mode,
      );
    } catch (error) {
      draft_error = error.message;
    }
  }
  const errors = AppText.get(KEY_ADMIN_CHAT_FILE_ERRORS);
  const error_text =
    errors[draft_error || file_error] ||
    (draft_error || file_error ? errors.default : "");
  const block_invalid = (event) => {
    if (draft_error) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  return (
    <ComposerPrimitive.Root
      className="chat-composer"
      onSubmitCapture={block_invalid}
    >
      <p id="admin-chat-files-note">
        {AppText.get(
          mode === "app-reference"
            ? KEY_ADMIN_CHAT_REFERENCE_NOTE
            : KEY_ADMIN_CHAT_FILES_NOTE,
        )}
      </p>
      {error_text && (
        <p role="alert" id="admin-chat-file-error">
          {error_text}
        </p>
      )}
      <ComposerPrimitive.Attachments>
        {() => <ChatAttachment />}
      </ComposerPrimitive.Attachments>
      <ComposerPrimitive.Input
        className="chat-input"
        rows={3}
        placeholder={AppText.get(KEY_ADMIN_CHAT_PLACEHOLDER)}
        aria-label={AppText.get(KEY_ADMIN_CHAT_PLACEHOLDER)}
        aria-describedby="admin-chat-status admin-chat-files-note"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) block_invalid(event);
        }}
        submitMode="enter"
      />
      <div className="chat-actions">
        <ComposerPrimitive.AddAttachment
          type="button"
          multiple
          disabled={
            mode === "app-reference" ||
            draft.attachments.length >= CHAT_FILE_COUNT
          }
          title={AppText.get(KEY_ADMIN_CHAT_FILES_NOTE)}
        >
          {AppText.get(KEY_ADMIN_CHAT_ATTACH)}
        </ComposerPrimitive.AddAttachment>
        <AuiIf condition={(state) => !state.thread.isRunning}>
          <ComposerPrimitive.Send
            disabled={!!draft_error}
            aria-describedby="admin-chat-files-note"
          >
            {AppText.get(KEY_ADMIN_CHAT_SEND)}
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(state) => state.thread.isRunning}>
          <span role="status">{AppText.get(KEY_ADMIN_CHAT_WORKING)}</span>
          <ComposerPrimitive.Cancel>
            {AppText.get(KEY_ADMIN_CHAT_STOP)}
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </ComposerPrimitive.Root>
  );
}

function ChatThread({ mode }) {
  const [file_error, set_file_error] = useState(null);
  const attachment_adapter = useMemo(
    () => create_chat_attachment_adapter(set_file_error),
    [],
  );
  const adapter = useMemo(() => model_adapter(mode), [mode]);
  const runtime = useLocalRuntime(adapter, {
    adapters: { attachments: attachment_adapter },
  });
  useEffect(() => () => runtime.thread.cancelRun(), [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="chat-thread">
        <p className="chat-status" role="status" id="admin-chat-status">
          {AppText.get(KEY_ADMIN_CHAT_STATUS)}
        </p>
        <ThreadPrimitive.Viewport className="chat-viewport">
          <AuiIf condition={(state) => state.thread.isEmpty}>
            <div className="chat-empty">
              <h2>{AppText.get(KEY_ADMIN_CHAT_EMPTY_TITLE)}</h2>
              <p>
                {AppText.get(
                  mode === "app-reference"
                    ? KEY_ADMIN_CHAT_REFERENCE_NOTE
                    : KEY_ADMIN_CHAT_EMPTY_NOTE,
                )}
              </p>
            </div>
          </AuiIf>
          <ThreadPrimitive.Messages>
            {() => <ChatMessage />}
          </ThreadPrimitive.Messages>
        </ThreadPrimitive.Viewport>
        <ChatComposer
          file_error={file_error}
          set_file_error={set_file_error}
          mode={mode}
        />
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

export function AdminChat() {
  const [mode, set_mode] = useState("chat");
  return (
    <ChatLayout>
      <styles.SectionTitle>
        {AppText.get(KEY_ADMIN_CHAT_TITLE)}
      </styles.SectionTitle>
      <div className="chat-status">
        <label>
          {AppText.get(KEY_ADMIN_CHAT_MODE)}{" "}
          <select
            value={mode}
            onChange={(event) => set_mode(event.target.value)}
          >
            <option value="chat">{AppText.get(KEY_ADMIN_CHAT_GENERAL)}</option>
            <option value="app-reference">
              {AppText.get(KEY_ADMIN_CHAT_REFERENCE)}
            </option>
          </select>
        </label>
        <p>{AppText.get(KEY_ADMIN_CHAT_MODE_NOTE)}</p>
      </div>
      <ChatThread key={mode} mode={mode} />
    </ChatLayout>
  );
}

export default AdminChat;
