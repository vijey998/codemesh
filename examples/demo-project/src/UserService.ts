export interface User { id: string; name: string }
export interface ApiClient { get(path: string): Promise<{ data?: User[] }> }

export class UserService {
  constructor(private readonly api: ApiClient) {}

  async firstUserName(): Promise<string> {
    const response = await this.api.get("/users");
    return response.data![0]!.name;
  }
}
