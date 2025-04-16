import { Request } from 'express';
import { User } from 'src/users/user.entity';
import { Admin } from 'src/admin/admin.entity';
export interface RequestWithUser extends Request {
  user: User;
}

export interface RequestWithAdmin extends Request {
  user: Admin;
}
