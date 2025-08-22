import staticPlugin from "@elysiajs/static";
import { html, Html } from "@elysiajs/html";
import { Elysia, t } from "elysia";
import * as windows1251 from "windows-1251";

interface AppProps {
  week?: number,
  group?: string,
  custom?: string,
  current?: string,
  next?: string,
  userAgent?: string,
}

interface ScheduleProps {
  group?: string,
  week?: number,
  epoch?: number,
  userAgent?: string,
}

const oneDay = (60 * 60 * 24) * 1000;
const oneWeek = oneDay * 7;

const dayMapping = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const monthMapping = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function isMobile(userAgent: string | undefined) {
  return userAgent?.includes("iPhone") || userAgent?.includes("Android");
}

function ScheduleLesson({ lesson, index }: { lesson: any, index: number }) {
  if (lesson.empty !== undefined) {
    return (<>{index + 1}. Пусто<br /></>);
  }

  let lessonType = "";
  let auditorium = "";
  if (lesson.lesson_type != undefined) {
    lessonType = " " + lesson.lesson_type.toLowerCase();
  }
  if (lesson.auditorium != undefined) {
    if (lesson.auditorium == "Актовый зал") {
      auditorium = ", " + lesson.auditorium.toLowerCase();
    } else {
      auditorium = ", аудитория " + lesson.auditorium.toLowerCase();
    }
  }

  return (<>{index + 1}. {lesson.name}{lessonType}{auditorium}<br /></>);
}

function ScheduleEntry({ entry }: { entry: any }) {
  return (
    <>
      {/* @ts-ignore */}
      <td valign="top" width="400">
        {entry.dayName}<br />
        {entry.lessons.length === 0 ? <>Пусто</> : entry.lessons.map((v: any, i: number) => <ScheduleLesson lesson={v} index={i} />)}
      </td>
    </>
  );
}

function ScheduleRow({ row }: { row: any }) {
  return (<tr>{row.map((v: any) => <ScheduleEntry entry={v} />)}</tr>);
}

async function Schedule({ group, week, epoch, userAgent }: ScheduleProps) {
  if (group === undefined || group === "none" || week === undefined) {
    return (<>Выберите группу в списке</>);
  }

  const response = await fetch(`${process.env.API}/schedule?group_id=${group}&week=${week}`);
  const schedule = await response.json();

  let totalLength = 0;
  for (let i = 0; i < schedule.ok.length; i++) {
    totalLength += schedule.ok[i].length;
  }

  if (totalLength == 0) {
    return (<>Нет данных на неделю {week}</>);
  }

  const weekStartDate = new Date(epoch! + (oneWeek * (week - 1)));
  const weekEndDate = new Date(epoch! + (oneWeek * (week - 1) + oneDay * 5));

  if (isMobile(userAgent)) {
    return (
      <>
        {`Неделя ${week}, с ${weekStartDate.getDate()} ${monthMapping[weekStartDate.getMonth()]} по ${weekEndDate.getDate()} ${monthMapping[weekEndDate.getMonth()]}`}
        <table>
          {schedule.ok.slice(0, 6).map((v: any, i: number) => <tr><ScheduleEntry entry={{ dayName: dayMapping[i], lessons: v }} /></tr>)}
        </table>
      </>
    );
  }

  const entries = [];
  let temp: any[] = [];
  for (let i = 0; i < schedule.ok.length; i++) {
    if (temp.length === 2) {
      entries.push(temp);
      temp = [];
    }

    if (i == 6) {
      break;
    }

    temp.push({
      dayName: dayMapping[i],
      lessons: schedule.ok[i],
    });
  }

  return (
    <>
      {`Неделя ${week}, с ${weekStartDate.getDate()} ${monthMapping[weekStartDate.getMonth()]} по ${weekEndDate.getDate()} ${monthMapping[weekEndDate.getMonth()]}`}
      <table>
        {entries.map(v => <ScheduleRow row={v} />)}
      </table>
    </>
  );
}

async function App({ week, group, custom, current, next, userAgent }: AppProps) {
  let response = await fetch(`${process.env.API}/product/name`);
  const productName = await response.text();

  response = await fetch(`${process.env.API}/groups/list`);
  const groups = await response.json();

  let activeEpoch = undefined;
  let activeWeek = week;
  if (group !== undefined && group !== "none") {
    const response = await fetch(`${process.env.API}/epoch?group_id=${group}`);
    const epoch = await response.json();
    const date = new Date();
    let dayOffset = 0;
    if (date.getDay() === 0) {
      dayOffset = oneDay;
    }
    const offset = date.getTimezoneOffset() * 60 * 1000;
    const currentWeek = Math.ceil(((date.valueOf() - epoch.ok.epoch - offset + dayOffset) / 60 / 60 / 24 / 7) / 1000);
    if (current === null) {
      activeWeek = currentWeek;
    } else if (next === null) {
      activeWeek = currentWeek + 1;
    }
    activeEpoch = epoch.ok.epoch;
  }

  return (
    <html>
      <head>
        <meta charset="windows-1251" />
        {isMobile(userAgent) ? <meta name="viewport" content="width=device-width, initial-scale=1.0" /> : <></>}
        <link rel="stylesheet" href="/public/style.css" />
        <title>Расписание</title>
      </head>
      <body>
        <img src="/public/logo.gif" />
        <br />
        {productName}
        <form>
          Расписание
          <select name="group">
            <option value="none">Группа</option>
            {groups.ok.map((v: any) => v.id == group ? <option value={v.id} selected>{v.name}</option> : <option value={v.id}>{v.name}</option>)}
          </select>
          <br />
          Неделя:
          <input type="number" name="week" value={activeWeek === undefined ? "1" : `${activeWeek}`} min="1" placeholder="Неделя" />
          <input type="submit" name="custom" value="Получить" />
          <input type="submit" name="current" value="Текущая неделя" />
          <input type="submit" name="next" value="Следующая неделя" />
        </form>
        <Schedule week={activeWeek} group={group} epoch={activeEpoch} userAgent={userAgent} />
      </body>
    </html>
  );
}

const app = new Elysia()
  .use(html())
  .use(staticPlugin())
  .get("/", async ({ query, headers }) => <App {...query} userAgent={headers["user-agent"]} />, {
    query: t.Object({
      week: t.Optional(t.Number()),
      group: t.Optional(t.String()),
      custom: t.Optional(t.Any()),
      current: t.Optional(t.Any()),
      next: t.Optional(t.Any()),
    }),
    afterHandle: ({ response }) => {
      return new Response(new Uint8Array(windows1251.encode(response as string)), {
        headers: {
          "content-type": "text/html; charset=windows-1251",
        }
      });
    },
  })
  .listen(process.env.PORT ?? 3000);

console.log(`App is running at ${app.server?.hostname}:${app.server?.port}`);
