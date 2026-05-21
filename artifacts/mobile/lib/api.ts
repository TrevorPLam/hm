import { fetch } from "expo/fetch";

let _baseUrl = "";

export function getApiUrl(): string {
  if (_baseUrl) return _baseUrl;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/`;
  return "http://localhost/";
}

export function setApiBaseUrl(url: string) {
  _baseUrl = url;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
}

export async function streamChat(
  conversationId: number,
  content: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const baseUrl = getApiUrl();
  const response = await fetch(
    `${baseUrl}api/openai/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed: StreamChunk = JSON.parse(data);
        if (parsed.content) onChunk(parsed.content);
      } catch {}
    }
  }
}
