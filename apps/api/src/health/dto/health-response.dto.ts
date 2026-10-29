/** Response shapes for the health route (Swagger docs; checked against the controller by tsc). */

export class HealthResponse {
  status!: string;
  service!: string;
  uptime!: number;
  timestamp!: string;
}
