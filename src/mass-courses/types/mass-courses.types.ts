export interface Account {
  id: string;
  email: string;
  name?: string;
  [key: string]: any;
}

export interface Enrolled {
  account: {
    id?: string;
    email?: string;
    name?: string;
    account_id?: string | null;
    isMatched?: boolean;
    [key: string]: any;
  };
}

export interface Course {
  id: string;
  title: string;
  category?: string;
  MassEnrolled?: Enrolled[];
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: {
    items: T[];
    totalData: number;
    [key: string]: any;
  };
  [key: string]: any;
}
