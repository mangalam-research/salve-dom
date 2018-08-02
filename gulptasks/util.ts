// tslint:disable-next-line:import-name
import Bluebird from "bluebird";
import { execFile } from "child-process-promise";
// tslint:disable-next-line:import-name
import childProcess from "child_process";
import fancyLog from "fancy-log";
import fsExtra from "fs-extra";
import gulp from "gulp";
// tslint:disable-next-line:match-default-export-name
import gulpNewer from "gulp-newer";

declare module "fs-extra" {
  export function mkdirAsync(dir: string): Promise<any>;
  export function readFileAsync(path: string): Promise<Buffer>;
  export function writeFileAsync(path: string, content: string): Promise<void>;
  export function renameAsync(fromPath: string, toPath: string): Promise<void>;
}

function promisifyFS<T extends object>(x: T): T {
  return Bluebird.promisifyAll(x);
}

export const fs = promisifyFS(fsExtra);

export const mkdirpAsync = (fs as any).ensureDirAsync.bind(fs);
export const copy = (fs as any).copyAsync.bind(fs);

export { execFile };

export function cprp(src: string, dest: string): Promise<void> {
  return copy(src, dest, { clobber: true, preserveTimestamps: true });
}

export function exec(command: string,
                     options?: any): Promise<[string, string]> {
  return new Promise<[string, string]>((resolve, reject) => {
    childProcess.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        fancyLog(stdout);
        fancyLog(stderr);
        reject(err);
      }
      resolve([stdout.toString(), stderr.toString()]);
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

/**
 * Why use this over spawn with { stdio: "inherit" }? If you use this function,
 * the results will be shown in one shot, after the process exits, which may
 * make things tidier.
 *
 * However, not all processes are amenable to this. When running Karma, for
 * instance, it is desirable to see the progress "live" and so using spawn is
 * better.
 */
export function execFileAndReport(
  file: string,
  args?: string[],
  options?: childProcess.ExecFileOptionsWithStringEncoding): Promise<void> {
  return execFile(file, args, options)
    .then((result) => {
      if (result.stdout) {
        fancyLog(result.stdout);
      }
    }, (err) => {
      if (err.stdout) {
        fancyLog(err.stdout);
      }
      throw err;
    });
}
