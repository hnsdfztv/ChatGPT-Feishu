import axios from "https://deno.land/x/axios/mod.ts";

export class GeminiApi {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: { apiKey: string; model: string }) {
    this.apiKey = config.apiKey;
    this.baseURL = "https://chat-gemini-play-26.deno.dev/v1/chat/completions";
    this.model = config.model;
  }

  async createChatCompletion(params: { messages: any[] }) {
    const response = await axios({
      method: 'post',
      url: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'  
      },
      data: {
        messages: params.messages,
        model: this.model
      }
    });
    return response.data;
  }

  async createImage() {
    throw new Error("Image generation not supported by Gemini API");
  }
}
