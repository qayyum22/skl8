import { AppRole } from './base';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}