import cron from "cron";
import https from "https";

const job = new cron.CronJob("*/14 * * * *", () => {
  const url = process.env.API_URL;
  https
    .get(url, (res) => {
      if (res.statusCode === 200) console.log("API is up and running");
      else console.log(`statusCode: ${res.statusCode}`);
    })
    .on("error", (e) => {
      console.error(e);
    });
});
export default job;
