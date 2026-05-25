import { helper } from "../utils";

export async function fetchData(url: string): Promise<unknown> {
  const result = await fetch(url);
  helper();
  return result.json();
}

export class ApiClient {
  private baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  async get(path: string) {
    return fetchData(`${this.baseUrl}${path}`);
  }
}
