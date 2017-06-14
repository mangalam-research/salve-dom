import * as Promise from "bluebird";
import * as childProcess from "child_process";
import * as _fs from "fs-extra";
import * as gulp from "gulp";
import * as gulpNewer from "gulp-newer";
import * as gutil from "gulp-util";
import * as touch from "touch";

declare module "fs-extra" {
  export function mkdirAsync(dir: string): Promise<any>;
  export function readFileAsync(path: string): Promise<Buffer>;
  export function writeFileAsync(path: string, content: string): Promise<void>;
}

function promisifyFS<T>(x: T): T {
  return Promise.promisifyAll(x) as T;
}

export const fs = promisifyFS(_fs);

export const mkdirpAsync = (fs as any).ensureDirAsync.bind(fs);
export const copy = (fs as any).copyAsync.bind(fs);
export const touchAsync = Promise.promisify(touch);

export function cprp(src: string, dest: string): Promise<void> {
  return copy(src, dest, { clobber: true, preserveTimestamps: true });
}

export function exec(command: string,
                     options?: any): Promise<[string, string]> {
  return new Promise<[string, string]>((resolve, reject) => {
    childProcess.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        gutil.log(stdout);
        gutil.log(stderr);
        reject(err);
      }
      resolve([stdout, stderr]);
    });
  });
}

export function execFile(command: string, args: string[], options: any):
Promise<[string, string]> {
  return new Promise<[string, string]>((resolve, reject) => {
    childProcess.execFile(command, args, options, (err, stdout, stderr) => {
      if (err) {
        gutil.log(stdout);
        gutil.log(stderr);
        reject(err);
      }
      resolve([stdout, stderr]);
    });
  });
}

export function existsInFile(fpath: string, re: RegExp): Promise<boolean> {
  return (fs as any).readFileAsync(fpath)
    .then((data: Buffer) => data.toString().search(re) !== -1);
}

export function newer(src: string | string[], dest: string,
                      forceDestFile: boolean = false): Promise<boolean> {
  // We use gulp-newer to perform the test and convert it to a promise.
  const options = {
    dest,
  } as any;

  if (forceDestFile) {
    options.map = () => ".";
  }

  return new Promise<boolean>((resolve) => {
    const stream = gulp.src(src, { read: false })
      .pipe(gulpNewer(options));

    function end(): void {
      resolve(false);
    }

    stream.on("data", () => {
      stream.removeListener("end", end);
      stream.end();
      resolve(true);
    });

    stream.on("end", end);
  });
}

export function spawn(cmd: string, args: string[], options: {}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = childProcess.spawn(cmd, args || [], options || {});

    child.on("exit", (code, signal) => {
      if (code) {
        reject(new Error(`child terminated with code: ${code}`));
        return;
      }

      if (signal) {
        reject(new Error(`child terminated with signal: ${signal}`));
        return;
      }

      resolve();
    });
  });
}
