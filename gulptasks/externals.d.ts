declare module "karma" {
  const x: any;
  export = x;
}

declare module "child-process-promise" {
  import { ExecFileOptions,
           ExecFileOptionsWithStringEncoding } from "child_process";

  export type ExecResult = {
    stdout: string,
    stderr: string,
  };

  type Opts = ExecFileOptions | ExecFileOptionsWithStringEncoding;

  export function execFile(file: string, args?: string[],
                           options?: Opts): Promise<ExecResult>;
}
