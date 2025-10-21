export interface EmailAccount {
  id: string;
  email: string;
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}