import fs from "fs/promises";
import path from "path";
import childProcess from "child_process";
import { promisify } from "util";
const exec = promisify(childProcess.exec);
const go = async () => {
  try {
    const distDirBrowser = path.join("./", "dist");
    const distDirServer = path.join("..", "server", "dist");

    fs.rm(distDirBrowser, { recursive: true, force: true }).catch((err) =>
      console.log("no dir was found")
    );
    await fs
      .rm(distDirServer, { recursive: true, force: true })
      .catch((err) => console.log("no dir to remove"));
    await exec("npm run build ");
    await fs.cp(distDirBrowser, distDirServer, { recursive: true });
    process.exit();
  } catch (error) {
    console.log(error);

    console.log("an error happened ", error.message);
    process.exit();
  }
};
go();
