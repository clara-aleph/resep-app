declare module "@jerrycoder/instagram-api" {
  export function instagram(url: string): Promise<{ type?: string; url?: string }>;
}
