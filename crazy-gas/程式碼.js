/**
 * AI 指揮官 CRAZY
 * 最新版 Code.gs
 * 已取消 CG 強制觸發
 * 時區：Asia/Taipei
 */

const CRAZY = {
  TZ: 'Asia/Taipei',
  CALENDAR: '雅世代工作行程',

  S: {
    SET: 'CRAZY_Settings',
    PROJ: 'CRAZY_Projects',
    TASK: 'CRAZY_Tasks',
    ALERT: 'CRAZY_Alerts',
    DOC: 'CRAZY_Docs',
    LOG: 'CRAZY_Log'
  }
};


/* =========================================================
 * Google Sheets 選單
 * =======================================================*/

function onOpen() {
  SpreadsheetApp
    .getUi()
    .createMenu('CRAZY')
    .addItem('初始化 CRAZY', 'initializeCrazy')
    .addItem('掃描缺漏', 'scanGapsAndStore')
    .addItem('建立每日觸發器', 'createDailyTrigger')
    .addToUi();
}


/* =========================================================
 * Web App
 * =======================================================*/

function doGet(e) {
  initializeCrazy();

  const template = HtmlService
    .createTemplateFromFile('Index');

  template.initialCommand =
    e && e.parameter && e.parameter.cmd
      ? String(e.parameter.cmd)
      : '';

  template.appUrl =
    ScriptApp.getService().getUrl() || '';

  template.voiceUrl =
    'https://joe-fu-iron.github.io/event-helper/crazy-voice/';

  return template
    .evaluate()
    .setTitle('AI 指揮官 CRAZY')
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    )
    .addMetaTag(
      'viewport',
      'width=device-width,initial-scale=1,viewport-fit=cover'
    );
}


/* =========================================================
 * CRAZY 初始化
 * =======================================================*/

function initializeCrazy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(
    ss,
    CRAZY.S.SET,
    ['key', 'value', 'updatedAt']
  );

  ensureSheet_(
    ss,
    CRAZY.S.PROJ,
    [
      'id',
      'name',
      'status',
      'progress',
      'next',
      'owner',
      'updatedAt'
    ]
  );

  ensureSheet_(
    ss,
    CRAZY.S.TASK,
    [
      'id',
      'title',
      'project',
      'due',
      'urgent',
      'done',
      'source',
      'externalId',
      'updatedAt'
    ]
  );

  ensureSheet_(
    ss,
    CRAZY.S.ALERT,
    [
      'id',
      'text',
      'project',
      'level',
      'source',
      'resolved',
      'updatedAt'
    ]
  );

  ensureSheet_(
    ss,
    CRAZY.S.DOC,
    [
      'id',
      'name',
      'project',
      'fileId',
      'mimeType',
      'url',
      'note',
      'updatedAt'
    ]
  );

  ensureSheet_(
    ss,
    CRAZY.S.LOG,
    [
      'timestamp',
      'command',
      'action',
      'status',
      'detail'
    ]
  );

  seedInitialData_();

  setIfMissing_(
    'calendarName',
    CRAZY.CALENDAR
  );

  setIfMissing_(
    'dailyBriefHour',
    '8'
  );

  const response = {
    ok: true
  };

  return JSON.parse(
    JSON.stringify(response)
  );
}


/* =========================================================
 * 初始資料
 * =======================================================*/

function seedInitialData_() {
  const projectSheet =
    sheet_(CRAZY.S.PROJ);

  if (
    projectSheet.getLastRow() === 1
  ) {
    projectSheet
      .getRange(
        2,
        1,
        3,
        7
      )
      .setValues([
        [
          'P-CRAZY',
          'AI 指揮官 CRAZY',
          '進行中',
          78,
          '完成正式部署並開始 Google 服務整合測試',
          'Joe',
          new Date()
        ],
        [
          'P-TOUFEN',
          '2026 頭份秋季育樂活動',
          '進行中',
          72,
          '團體報名與籌備會執行',
          'Joe',
          new Date()
        ],
        [
          'P-HOULONG',
          '後龍好望角音樂節',
          '收尾',
          94,
          '完成成果報告',
          'Joe',
          new Date()
        ]
      ]);
  }

  const taskSheet =
    sheet_(CRAZY.S.TASK);

  if (
    taskSheet.getLastRow() === 1
  ) {
    taskSheet.appendRow([
      'T-HOULONG',
      '完成後龍好望角成果報告',
      '後龍好望角音樂節',
      '',
      true,
      false,
      'seed',
      '',
      new Date()
    ]);
  }
}


/* =========================================================
 * 首頁初始化資料
 * =======================================================*/

function apiBootstrap() {
  initializeCrazy();

  let calendarStatus = {
    connected: false
  };

  let tasksStatus = {
    connected: false
  };

  let gmailStatus = {
    connected: false
  };

  let driveStatus = {
    connected: false
  };

  try {
    const calendar =
      resolveCalendar_();

    calendarStatus = {
      connected: !!calendar,
      name:
        calendar
          ? calendar.getName()
          : ''
    };
  } catch (e) {
    calendarStatus.error =
      e.message;
  }

  try {
    const list =
      resolveTaskList_();

    tasksStatus = {
      connected: !!list,
      title:
        list
          ? list.title
          : ''
    };
  } catch (e) {
    tasksStatus.error =
      e.message;
  }

  try {
    gmailStatus = {
      connected: true,
      unread:
        GmailApp.getInboxUnreadCount()
    };
  } catch (e) {
    gmailStatus.error =
      e.message;
  }

  try {
    DriveApp
      .getRootFolder()
      .getName();

    driveStatus = {
      connected: true
    };
  } catch (e) {
    driveStatus.error =
      e.message;
  }

  const response = {
    ok: true,

    status: {
      sheets: {
        connected: true,
        name:
          SpreadsheetApp
            .getActiveSpreadsheet()
            .getName()
      },

      calendar:
        calendarStatus,

      tasks:
        tasksStatus,

      gmail:
        gmailStatus,

      drive:
        driveStatus
    },

    projects:
      rows_(CRAZY.S.PROJ),

    localTasks:
      rows_(CRAZY.S.TASK),

    alerts:
      rows_(CRAZY.S.ALERT),

    docs:
      rows_(CRAZY.S.DOC),

    dailyBrief:
      buildDailyBrief_()
  };

  return JSON.parse(
    JSON.stringify(response)
  );
}


/* =========================================================
 * Google Calendar
 * =======================================================*/

function apiListAgenda(days) {
  days =
    Math.max(
      1,
      Math.min(
        Number(days || 7),
        31
      )
    );

  const calendar =
    resolveCalendar_();

  const start =
    new Date();

  start.setHours(
    0,
    0,
    0,
    0
  );

  const end =
    new Date(
      start.getTime() +
      days * 86400000
    );

  const events =
    calendar
      .getEvents(
        start,
        end
      )
      .map(
        function(event) {
          return {
            id:
              event.getId(),

            title:
              event.getTitle(),

            start:
              event
                .getStartTime()
                .toISOString(),

            end:
              event
                .getEndTime()
                .toISOString(),

            location:
              event.getLocation() || '',

            description:
              event.getDescription() || '',

            allDay:
              event.isAllDayEvent()
          };
        }
      );

  return {
    ok: true,
    events: events
  };
}


function apiCreateCalendarEvent(payload) {
  payload =
    payload || {};

  const title =
    String(
      payload.title || ''
    )
    .trim();

  if (!title) {
    throw new Error(
      '缺少行程名稱'
    );
  }

  const calendar =
    resolveCalendar_();

  const start =
    new Date(
      payload.start
    );

  const end =
    payload.end
      ? new Date(payload.end)
      : new Date(
          start.getTime() +
          3600000
        );

  const event =
    calendar.createEvent(
      title,
      start,
      end,
      {
        description:
          String(
            payload.description || ''
          ),

        location:
          String(
            payload.location || ''
          )
      }
    );

  if (
    payload.reminderMinutes !== undefined
  ) {
    const minutes =
      Number(
        payload.reminderMinutes
      );

    if (
      minutes >= 5 &&
      minutes <= 40320
    ) {
      event.addPopupReminder(
        minutes
      );
    }
  }

  log_(
    '新增行程 ' + title,
    'calendar_create',
    'ok',
    event.getId()
  );

  return {
    ok: true,
    id:
      event.getId(),
    title:
      event.getTitle()
  };
}


function apiCreateDailyWorkSeries_(title, startDate, endDate) {
  const calendar = resolveCalendar_();
  const firstEnd = new Date(startDate.getTime() + 3600000);
  const existing = calendar
    .getEvents(startDate, firstEnd)
    .some(function(event) {
      return event.getTitle() === title;
    });

  if (existing) {
    return {
      ok: true,
      duplicate: true,
      title: title
    };
  }

  const until = new Date(endDate);
  until.setHours(23, 59, 59, 999);

  const recurrence = CalendarApp
    .newRecurrence()
    .addDailyRule()
    .until(until);

  const series = calendar.createEventSeries(
    title,
    startDate,
    firstEnd,
    recurrence,
    {
      description: '由 CRAZY 語音建立的每日重複工作'
    }
  );

  series.addPopupReminder(30);

  log_(
    '新增每日工作 ' + title,
    'calendar_series_create',
    'ok',
    series.getId()
  );

  return {
    ok: true,
    duplicate: false,
    id: series.getId(),
    title: title
  };
}


function chineseNumber_(value) {
  const text = String(value || '').trim();

  if (/^\d+$/.test(text)) {
    return Number(text);
  }

  const digits = {
    '零': 0,
    '〇': 0,
    '一': 1,
    '二': 2,
    '兩': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '七': 7,
    '八': 8,
    '九': 9
  };

  if (text === '十') {
    return 10;
  }

  if (text.indexOf('十') >= 0) {
    const parts = text.split('十');
    return (parts[0] ? digits[parts[0]] : 1) * 10 +
      (parts[1] ? digits[parts[1]] : 0);
  }

  return digits[text];
}


function normalizeVoiceCommand_(command) {
  return String(command || '')
    .replace(/帮/g, '幫')
    .replace(/从/g, '從')
    .replace(/开/g, '開')
    .replace(/点/g, '點')
    .replace(/钟/g, '鐘')
    .replace(/号/g, '號')
    .replace(/资料/g, '資料')
    .replace(/[。！!]+$/g, '')
    .trim();
}


/* =========================================================
 * Google Tasks
 * =======================================================*/

function apiListGoogleTasks(maxResults) {
  const list =
    resolveTaskList_();

  if (!list) {
    return {
      ok: false,
      error:
        '找不到 Google Tasks 清單'
    };
  }

  const max =
    Math.max(
      1,
      Math.min(
        Number(
          maxResults || 50
        ),
        100
      )
    );

  const url =
    'https://tasks.googleapis.com/tasks/v1/lists/' +
    encodeURIComponent(
      list.id
    ) +
    '/tasks?showCompleted=false' +
    '&showHidden=false' +
    '&maxResults=' +
    max;

  const result =
    googleFetch_(
      url,
      {
        method: 'get'
      }
    );

  return {
    ok: true,

    taskList:
      list,

    tasks:
      (
        result.items || []
      )
      .map(
        function(task) {
          return {
            id:
              task.id,

            title:
              task.title || '',

            notes:
              task.notes || '',

            due:
              task.due || null,

            status:
              task.status ||
              'needsAction'
          };
        }
      )
  };
}


function apiCreateGoogleTask(payload) {
  payload =
    payload || {};

  const title =
    String(
      payload.title || ''
    )
    .trim();

  if (!title) {
    throw new Error(
      '缺少工作名稱'
    );
  }

  const list =
    resolveTaskList_();

  if (!list) {
    throw new Error(
      '找不到 Google Tasks 清單'
    );
  }

  const body = {
    title:
      title
  };

  if (
    payload.notes
  ) {
    body.notes =
      String(
        payload.notes
      );
  }

  if (
    payload.due
  ) {
    const date =
      new Date(
        payload.due
      );

    body.due =
      new Date(
        Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        )
      )
      .toISOString();
  }

  const url =
    'https://tasks.googleapis.com/tasks/v1/lists/' +
    encodeURIComponent(
      list.id
    ) +
    '/tasks';

  const task =
    googleFetch_(
      url,
      {
        method: 'post',

        contentType:
          'application/json',

        payload:
          JSON.stringify(body)
      }
    );

  log_(
    '新增工作 ' + title,
    'task_create',
    'ok',
    task.id || ''
  );

  return {
    ok: true,
    task:
      task
  };
}


/* =========================================================
 * Gmail
 * =======================================================*/

function apiInboxSummary(maxThreads) {
  maxThreads =
    Math.max(
      1,
      Math.min(
        Number(
          maxThreads || 20
        ),
        50
      )
    );

  const threads =
    GmailApp.getInboxThreads(
      0,
      maxThreads
    );

  const data =
    threads.map(
      function(thread) {
        const messages =
          thread.getMessages();

        const message =
          messages[
            messages.length - 1
          ];

        return {
          id:
            thread.getId(),

          subject:
            thread
              .getFirstMessageSubject() ||
            '(無主旨)',

          from:
            message.getFrom() || '',

          date:
            message
              .getDate()
              .toISOString(),

          unread:
            thread.isUnread(),

          important:
            thread.isImportant(),

          snippet:
            (
              message.getPlainBody() || ''
            )
            .replace(
              /\s+/g,
              ' '
            )
            .slice(
              0,
              240
            )
        };
      }
    );

  return {
    ok: true,

    unread:
      GmailApp
        .getInboxUnreadCount(),

    threads:
      data
  };
}


function apiSearchMail(
  query,
  maxThreads
) {
  query =
    String(
      query || ''
    )
    .trim();

  if (!query) {
    throw new Error(
      '缺少 Gmail 搜尋條件'
    );
  }

  maxThreads =
    Math.max(
      1,
      Math.min(
        Number(
          maxThreads || 20
        ),
        50
      )
    );

  const threads =
    GmailApp.search(
      query,
      0,
      maxThreads
    );

  return {
    ok: true,

    threads:
      threads.map(
        function(thread) {
          const messages =
            thread.getMessages();

          const message =
            messages[
              messages.length - 1
            ];

          return {
            subject:
              thread
                .getFirstMessageSubject() ||
              '(無主旨)',

            from:
              message.getFrom() || '',

            date:
              message
                .getDate()
                .toISOString(),

            unread:
              thread.isUnread(),

            snippet:
              (
                message.getPlainBody() || ''
              )
              .replace(
                /\s+/g,
                ' '
              )
              .slice(
                0,
                240
              )
          };
        }
      )
  };
}


/* =========================================================
 * Google Drive
 * =======================================================*/

function apiSearchDriveFiles(
  query,
  maxResults
) {
  query =
    String(
      query || ''
    )
    .trim();

  if (!query) {
    throw new Error(
      '缺少文件搜尋關鍵字'
    );
  }

  maxResults =
    Math.max(
      1,
      Math.min(
        Number(
          maxResults || 30
        ),
        100
      )
    );

  const escapedQuery =
    query.replace(
      /'/g,
      "\\'"
    );

  const iterator =
    DriveApp.searchFiles(
      "trashed = false and name contains '" +
      escapedQuery +
      "'"
    );

  const files = [];

  while (
    iterator.hasNext() &&
    files.length < maxResults
  ) {
    const file =
      iterator.next();

    files.push({
      id:
        file.getId(),

      name:
        file.getName(),

      mimeType:
        file.getMimeType(),

      url:
        file.getUrl(),

      updated:
        file
          .getLastUpdated()
          .toISOString(),

      size:
        file.getSize()
    });
  }

  return {
    ok: true,
    files:
      files
  };
}


/* =========================================================
 * Drive 文件讀取
 * =======================================================*/

function apiReadDriveText(
  fileId,
  maxChars
) {
  fileId =
    String(
      fileId || ''
    )
    .trim();

  if (!fileId) {
    throw new Error(
      '缺少檔案 ID'
    );
  }

  maxChars =
    Math.max(
      500,
      Math.min(
        Number(
          maxChars || 15000
        ),
        60000
      )
    );

  const file =
    DriveApp.getFileById(
      fileId
    );

  const mimeType =
    file.getMimeType();

  let text = '';

  if (
    mimeType ===
    MimeType.GOOGLE_DOCS
  ) {
    text =
      DocumentApp
        .openById(fileId)
        .getBody()
        .getText();
  }

  else if (
    mimeType ===
    MimeType.GOOGLE_SHEETS
  ) {
    const spreadsheet =
      SpreadsheetApp
        .openById(fileId);

    const blocks = [];

    spreadsheet
      .getSheets()
      .slice(
        0,
        10
      )
      .forEach(
        function(sheet) {
          blocks.push(
            '【' +
            sheet.getName() +
            '】'
          );

          const values =
            sheet
              .getDataRange()
              .getDisplayValues();

          values
            .slice(
              0,
              200
            )
            .forEach(
              function(row) {
                blocks.push(
                  row.join('\t')
                );
              }
            );
        }
      );

    text =
      blocks.join('\n');
  }

  else if (
    mimeType ===
    MimeType.PLAIN_TEXT ||
    mimeType ===
    'text/csv' ||
    mimeType ===
    'application/json'
  ) {
    text =
      file
        .getBlob()
        .getDataAsString('UTF-8');
  }

  else {
    return {
      ok: false,

      error:
        '此格式目前先建立索引；Google Docs、Google Sheets、TXT、CSV、JSON 可直接讀取。',

      file: {
        id:
          file.getId(),

        name:
          file.getName(),

        mimeType:
          mimeType,

        url:
          file.getUrl()
      }
    };
  }

  return {
    ok: true,

    file: {
      id:
        file.getId(),

      name:
        file.getName(),

      mimeType:
        mimeType,

      url:
        file.getUrl()
    },

    text:
      String(
        text || ''
      )
      .slice(
        0,
        maxChars
      )
  };
}


/* =========================================================
 * 主動缺漏掃描
 * =======================================================*/

function apiScanGaps() {
  return scanGapsAndStore();
}


function scanGapsAndStore() {
  initializeCrazy();

  const alerts = [];

  rows_(CRAZY.S.PROJ)
    .forEach(
      function(project) {
        if (
          String(
            project.status
          ) !== '完成' &&
          (
            !project.next ||
            /待設定|未設定/
              .test(
                String(project.next)
              )
          )
        ) {
          alerts.push({
            text:
              '專案「' +
              project.name +
              '」尚未設定明確下一步',

            project:
              project.name,

            level:
              'warn',

            source:
              'project'
          });
        }
      }
    );

  rows_(CRAZY.S.TASK)
    .filter(
      function(task) {
        return (
          !toBool_(task.done) &&
          toBool_(task.urgent)
        );
      }
    )
    .forEach(
      function(task) {
        alerts.push({
          text:
            '高優先工作未完成：' +
            task.title,

          project:
            task.project || '一般',

          level:
            'urgent',

          source:
            'local_task'
        });
      }
    );

  try {
    const googleTasks =
      apiListGoogleTasks(100)
        .tasks || [];

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const soon =
      new Date(
        today.getTime() +
        2 * 86400000
      );

    googleTasks.forEach(
      function(task) {
        if (!task.due) {
          return;
        }

        const due =
          new Date(task.due);

        if (
          due < today
        ) {
          alerts.push({
            text:
              'Google Tasks 已逾期：' +
              task.title,

            project:
              'Google Tasks',

            level:
              'urgent',

            source:
              'google_tasks'
          });
        }

        else if (
          due <= soon
        ) {
          alerts.push({
            text:
              '兩天內到期：' +
              task.title,

            project:
              'Google Tasks',

            level:
              'warn',

            source:
              'google_tasks'
          });
        }
      }
    );
  } catch (e) {}

  try {
    const events =
      apiListAgenda(2)
        .events || [];

    const now =
      Date.now();

    const next24 =
      now +
      24 * 3600000;

    events.forEach(
      function(event) {
        const time =
          new Date(
            event.start
          ).getTime();

        if (
          time >= now &&
          time <= next24
        ) {
          alerts.push({
            text:
              '24 小時內行程：' +
              event.title,

            project:
              '行程',

            level:
              'info',

            source:
              'calendar'
          });
        }
      }
    );
  } catch (e) {}

  try {
    const inbox =
      apiInboxSummary(30);

    (
      inbox.threads || []
    )
    .forEach(
      function(mail) {
        if (!mail.unread) {
          return;
        }

        const content =
          mail.subject +
          ' ' +
          mail.snippet;

        if (
          /請回覆|確認|核定|修正|補件|簽核|急件|期限|deadline|urgent/i
            .test(content)
        ) {
          alerts.push({
            text:
              '可能需要處理的未讀信：' +
              mail.subject,

            project:
              'Gmail',

            level:
              'warn',

            source:
              'gmail'
          });
        }
      }
    );
  } catch (e) {}

  replaceAutoAlerts_(
    alerts
  );

  setSetting_(
    'lastScan',
    Utilities.formatDate(
      new Date(),
      CRAZY.TZ,
      'yyyy-MM-dd HH:mm:ss'
    )
  );

  log_(
    '主動缺漏掃描',
    'gap_scan',
    'ok',
    String(alerts.length)
  );

  return {
    ok: true,

    alerts:
      rows_(CRAZY.S.ALERT),

    lastScan:
      getSetting_(
        'lastScan'
      )
  };
}


/* =========================================================
 * 每日摘要
 * =======================================================*/

function apiDailyBrief() {
  return {
    ok: true,
    text:
      buildDailyBrief_()
  };
}


function buildDailyBrief_() {
  const lines = [
    'CRAZY 每日工作摘要',
    ''
  ];

  try {
    const agenda =
      apiListAgenda(1)
        .events || [];

    lines.push(
      '今日行程：' +
      agenda.length +
      ' 項'
    );

    agenda
      .slice(0, 6)
      .forEach(
        function(event) {
          lines.push(
            '- ' +
            Utilities.formatDate(
              new Date(event.start),
              CRAZY.TZ,
              'HH:mm'
            ) +
            ' ' +
            event.title
          );
        }
      );
  } catch (e) {
    lines.push(
      '今日行程：讀取失敗'
    );
  }

  try {
    const tasks =
      apiListGoogleTasks(50)
        .tasks || [];

    lines.push('');

    lines.push(
      'Google Tasks 未完成：' +
      tasks.length +
      ' 項'
    );

    tasks
      .slice(0, 6)
      .forEach(
        function(task) {
          lines.push(
            '- ' +
            task.title
          );
        }
      );
  } catch (e) {}

  try {
    const inbox =
      apiInboxSummary(20);

    lines.push('');

    lines.push(
      'Gmail 未讀：' +
      inbox.unread +
      ' 封'
    );

    (
      inbox.threads || []
    )
    .filter(
      function(mail) {
        return mail.unread;
      }
    )
    .slice(0, 5)
    .forEach(
      function(mail) {
        lines.push(
          '- ' +
          mail.subject
        );
      }
    );
  } catch (e) {}

  const alerts =
    rows_(CRAZY.S.ALERT)
      .filter(
        function(alert) {
          return (
            !toBool_(
              alert.resolved
            )
          );
        }
      );

  lines.push('');

  lines.push(
    'CRAZY 提醒：' +
    alerts.length +
    ' 項'
  );

  alerts
    .slice(0, 6)
    .forEach(
      function(alert) {
        lines.push(
          '- ' +
          alert.text
        );
      }
    );

  const projects =
    rows_(CRAZY.S.PROJ)
      .filter(
        function(project) {
          return (
            String(
              project.status
            ) !== '完成'
          );
        }
      );

  lines.push('');

  lines.push(
    '進行中專案：' +
    projects.length +
    ' 個'
  );

  projects
    .slice(0, 6)
    .forEach(
      function(project) {
        lines.push(
          '- ' +
          project.name +
          ' ' +
          project.progress +
          '%｜' +
          (
            project.next ||
            '未設定下一步'
          )
        );
      }
    );

  return lines.join('\n');
}


/* =========================================================
 * CRAZY 指令中心
 * 已取消 CG 強制開頭
 * =======================================================*/

function apiRunCommand(command) {
  let c =
    normalizeVoiceCommand_(
      command
    );

  if (!c) {
    return {
      ok: false,
      reply:
        '沒有收到指令。'
    };
  }

  log_(
    c,
    'route',
    'start',
    ''
  );

  const isRecurringWork =
    /(?:加入|新增).*工作/.test(c) &&
    /明天.*開始.*每天|明天開始每天/.test(c);

  if (isRecurringWork) {
    const hourMatch = c.match(
      /每天[\s，,]*(?:早上|上午)?[\s，,]*([零〇一二兩三四五六七八九十\d]+)[\s]*點/
    );
    const endMatch = c.match(
      /(?:一直[\s]*到|直到|到)[\s，,]*([零〇一二兩三四五六七八九十\d]+)[\s]*月[\s]*([零〇一二兩三四五六七八九十\d]+)[\s]*(?:日|號)/
    );
    const titleMatch = c.match(
      /(?:要|內容(?:是|為)?)[：:，,\s]*(.+)$/
    );
    const hour = hourMatch
      ? chineseNumber_(hourMatch[1])
      : NaN;
    const month = endMatch
      ? chineseNumber_(endMatch[1])
      : NaN;
    const day = endMatch
      ? chineseNumber_(endMatch[2])
      : NaN;
    const title = titleMatch
      ? titleMatch[1].trim()
      : '';
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(hour, 0, 0, 0);
    let endYear = startDate.getFullYear();

    if (month < startDate.getMonth() + 1) {
      endYear += 1;
    }

    const endDate = new Date(endYear, month - 1, day, 23, 59, 59, 999);

    if (
      !Number.isFinite(hour) ||
      hour < 0 ||
      hour > 23 ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isFinite(day) ||
      day < 1 ||
      day > 31 ||
      !title ||
      endDate < startDate
    ) {
      return okReply_(
        c,
        '已理解為每日重複工作，但日期、時間或內容不完整，尚未建立。',
        'recurring_work_invalid'
      );
    }

    const result = apiCreateDailyWorkSeries_(
      title,
      startDate,
      endDate
    );

    const rangeText =
      Utilities.formatDate(startDate, CRAZY.TZ, 'yyyy/MM/dd HH:mm') +
      ' 至 ' +
      Utilities.formatDate(endDate, CRAZY.TZ, 'yyyy/MM/dd');

    return okReply_(
      c,
      result.duplicate
        ? '這項每日工作已存在，沒有重複新增：' + title + '｜' + rangeText
        : '已建立每日重複工作：' + title + '｜' + rangeText,
      result.duplicate
        ? 'calendar_series_duplicate'
        : 'calendar_series_create'
    );
  }

  if (
    /每日摘要|今日摘要|早報|工作摘要/
      .test(c)
  ) {
    return okReply_(
      c,
      buildDailyBrief_(),
      'daily_brief'
    );
  }

  if (
    /掃描缺漏|抓缺漏|檢查缺漏/
      .test(c)
  ) {
    const result =
      scanGapsAndStore();

    const active =
      result.alerts
        .filter(
          function(alert) {
            return (
              !toBool_(
                alert.resolved
              )
            );
          }
        );

    return okReply_(
      c,
      '缺漏掃描完成，目前共有 ' +
      active.length +
      ' 項提醒。',
      'gap_scan'
    );
  }

  if (
    /查看.*進度|專案.*進度|目前.*進度/
      .test(c)
  ) {
    const text =
      rows_(CRAZY.S.PROJ)
        .map(
          function(project) {
            return (
              project.name +
              '：' +
              project.progress +
              '%｜下一步：' +
              (
                project.next ||
                '未設定'
              )
            );
          }
        )
        .join('\n');

    return okReply_(
      c,
      text || '目前沒有專案。',
      'project_status'
    );
  }

  if (
    /今天.*行程|今日.*行程|查看.*行程/
      .test(c)
  ) {
    const agenda =
      apiListAgenda(1);

    const text =
      (
        agenda.events || []
      )
      .map(
        function(event) {
          return (
            Utilities.formatDate(
              new Date(event.start),
              CRAZY.TZ,
              'HH:mm'
            ) +
            ' ' +
            event.title
          );
        }
      )
      .join('\n')
      ||
      '今天沒有行程。';

    return okReply_(
      c,
      text,
      'agenda'
    );
  }

  if (
    /查看.*工作|今天.*工作|今日.*工作|待辦/
      .test(c)
  ) {
    try {
      const result =
        apiListGoogleTasks(30);

      const text =
        (
          result.tasks || []
        )
        .map(
          function(task) {
            return (
              '• ' +
              task.title +
              (
                task.due
                  ? '｜' +
                    task.due.slice(
                      0,
                      10
                    )
                  : ''
              )
            );
          }
        )
        .join('\n')
        ||
        '目前沒有未完成 Google Tasks。';

      return okReply_(
        c,
        text,
        'tasks'
      );
    } catch (e) {
      const text =
        rows_(CRAZY.S.TASK)
          .filter(
            function(task) {
              return (
                !toBool_(
                  task.done
                )
              );
            }
          )
          .map(
            function(task) {
              return (
                '• ' +
                task.title
              );
            }
          )
          .join('\n')
          ||
          '目前沒有未完成工作。';

      return okReply_(
        c,
        text,
        'local_tasks'
      );
    }
  }

  if (
    /查看.*未讀信|查看.*信件|查看.*郵件|未讀信/
      .test(c)
  ) {
    const inbox =
      apiInboxSummary(20);

    const text =
      (
        inbox.threads || []
      )
      .filter(
        function(mail) {
          return mail.unread;
        }
      )
      .slice(0, 10)
      .map(
        function(mail) {
          return (
            '• ' +
            mail.subject +
            '｜' +
            mail.from
          );
        }
      )
      .join('\n')
      ||
      '目前沒有未讀信件。';

    return okReply_(
      c,
      text,
      'mail'
    );
  }

  let match =
    c.match(
      /^搜尋信件[：:\s]*(.+)$/
    );

  if (match) {
    const result =
      apiSearchMail(
        match[1].trim(),
        20
      );

    const text =
      (
        result.threads || []
      )
      .map(
        function(mail) {
          return (
            '• ' +
            mail.subject +
            '｜' +
            mail.from
          );
        }
      )
      .join('\n')
      ||
      '找不到符合的信件。';

    return okReply_(
      c,
      text,
      'mail_search'
    );
  }

  match =
    c.match(
      /^搜尋文件[：:\s]*(.+)$/
    );

  if (match) {
    const result =
      apiSearchDriveFiles(
        match[1].trim(),
        20
      );

    const text =
      (
        result.files || []
      )
      .map(
        function(file) {
          return (
            '• ' +
            file.name
          );
        }
      )
      .join('\n')
      ||
      '找不到符合的文件。';

    return {
      ok: true,
      reply:
        text,
      data:
        result.files,
      action:
        'doc_search'
    };
  }

  match =
    c.match(
      /^新增工作[：:\s]*(.+)$/
    );

  if (match) {
    const title =
      match[1].trim();

    try {
      apiCreateGoogleTask({
        title:
          title
      });

      return okReply_(
        c,
        '已加入 Google Tasks：' +
        title,
        'task_create'
      );
    } catch (e) {
      sheet_(CRAZY.S.TASK)
        .appendRow([
          'T-' +
          Utilities
            .getUuid()
            .slice(
              0,
              8
            ),

          title,

          '一般',

          '',

          false,

          false,

          'CRAZY',

          '',

          new Date()
        ]);

      return okReply_(
        c,
        'Google Tasks 尚未連線，已先存入 CRAZY 工作庫：' +
        title,
        'local_task_create'
      );
    }
  }

  match =
    c.match(
      /^記錄缺漏[：:\s]*(.+)$/
    );

  if (match) {
    const text =
      match[1].trim();

    sheet_(CRAZY.S.ALERT)
      .appendRow([
        'A-' +
        Utilities
          .getUuid()
          .slice(
            0,
            8
          ),

        text,

        '一般',

        'warn',

        'CRAZY',

        false,

        new Date()
      ]);

    return okReply_(
      c,
      '已記錄缺漏：' +
      text,
      'alert_create'
    );
  }

  match =
    c.match(
      /^新增行程[：:\s]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(\d{1,2}:\d{2})\s+(.+)$/
    );

  if (match) {
    const date =
      match[1]
        .replace(
          /\//g,
          '-'
        );

    const time =
      match[2];

    const title =
      match[3]
        .trim();

    const start =
      date +
      'T' +
      time +
      ':00+08:00';

    const startDate =
      new Date(start);

    apiCreateCalendarEvent({
      title:
        title,

      start:
        start,

      end:
        new Date(
          startDate.getTime() +
          3600000
        )
        .toISOString(),

      reminderMinutes:
        60
    });

    return okReply_(
      c,
      '已加入行事曆：' +
      title +
      '｜' +
      date +
      ' ' +
      time,
      'calendar_create'
    );
  }

  match =
    c.match(
      /^新增專案[：:\s]*(.+)$/
    );

  if (match) {
    const name =
      match[1]
        .trim();

    const id =
      'P-' +
      Utilities
        .getUuid()
        .slice(
          0,
          8
        );

    sheet_(CRAZY.S.PROJ)
      .appendRow([
        id,
        name,
        '進行中',
        0,
        '待設定下一步',
        'Joe',
        new Date()
      ]);

    return okReply_(
      c,
      '已建立專案：' +
      name,
      'project_create'
    );
  }

  return okReply_(
    c,

    '我已收到指令，但目前沒有足夠資訊安全執行。\n\n目前支援：\n每日摘要\n掃描缺漏\n查看進度\n查看今天行程\n查看工作\n查看未讀信\n搜尋信件\n搜尋文件\n新增工作\n記錄缺漏\n新增行程\n新增專案',

    'unknown'
  );
}


/* =========================================================
 * 每日觸發器
 * =======================================================*/

function createDailyTrigger() {
  deleteTriggersByHandler_(
    'dailyTriggerRunner'
  );

  let hour =
    Number(
      getSetting_(
        'dailyBriefHour'
      ) || 8
    );

  hour =
    Math.max(
      0,
      Math.min(
        hour,
        23
      )
    );

  ScriptApp
    .newTrigger(
      'dailyTriggerRunner'
    )
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();

  setSetting_(
    'dailyTriggerEnabled',
    'true'
  );

  return {
    ok: true,
    hour:
      hour
  };
}


function dailyTriggerRunner() {
  try {
    scanGapsAndStore();

    log_(
      '每日自動執行',
      'daily_trigger',
      'ok',
      buildDailyBrief_()
        .slice(
          0,
          500
        )
    );
  } catch (e) {
    log_(
      '每日自動執行',
      'daily_trigger',
      'error',
      String(
        e.message || e
      )
    );
  }
}


/* =========================================================
 * Google Calendar helper
 * =======================================================*/

function resolveCalendar_() {
  const name =
    getSetting_(
      'calendarName'
    ) ||
    CRAZY.CALENDAR;

  const calendars =
    CalendarApp
      .getCalendarsByName(
        name
      );

  if (
    calendars.length
  ) {
    return calendars[0];
  }

  return CalendarApp
    .getDefaultCalendar();
}


/* =========================================================
 * Google Tasks helper
 * =======================================================*/

function resolveTaskList_() {
  const savedId =
    getSetting_(
      'taskListId'
    );

  if (
    savedId
  ) {
    try {
      const saved =
        googleFetch_(
          'https://tasks.googleapis.com/tasks/v1/users/@me/lists/' +
          encodeURIComponent(savedId),
          {
            method:
              'get'
          }
        );

      if (
        saved &&
        saved.id
      ) {
        return saved;
      }
    } catch (e) {}
  }

  const result =
    googleFetch_(
      'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100',
      {
        method:
          'get'
      }
    );

  const lists =
    result.items || [];

  if (
    !lists.length
  ) {
    return null;
  }

  const selected =
    lists.find(
      function(list) {
        return (
          /工作|待辦|task/i
            .test(
              list.title || ''
            )
        );
      }
    )
    ||
    lists[0];

  setSetting_(
    'taskListId',
    selected.id
  );

  return selected;
}


/* =========================================================
 * Google API fetch
 * =======================================================*/

function googleFetch_(
  url,
  options
) {
  options =
    options || {};

  options.muteHttpExceptions =
    true;

  options.headers =
    Object.assign(
      {},
      options.headers || {},
      {
        Authorization:
          'Bearer ' +
          ScriptApp.getOAuthToken()
      }
    );

  const response =
    UrlFetchApp.fetch(
      url,
      options
    );

  const code =
    response
      .getResponseCode();

  const text =
    response
      .getContentText();

  let json = {};

  try {
    json =
      text
        ? JSON.parse(text)
        : {};
  } catch (e) {
    json = {
      raw:
        text
    };
  }

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      (
        json.error &&
        json.error.message
      )
      ||
      (
        'Google API HTTP ' +
        code
      )
    );
  }

  return json;
}


/* =========================================================
 * Sheet helpers
 * =======================================================*/

function ensureSheet_(
  spreadsheet,
  name,
  headers
) {
  let sheet =
    spreadsheet
      .getSheetByName(
        name
      );

  if (!sheet) {
    sheet =
      spreadsheet
        .insertSheet(name);
  }

  if (
    sheet.getLastRow() === 0
  ) {
    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([
        headers
      ]);
  }
}


function sheet_(name) {
  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(name);

  if (!sheet) {
    throw new Error(
      '缺少工作表：' +
      name
    );
  }

  return sheet;
}


function rows_(name) {
  const sheet =
    sheet_(name);

  const values =
    sheet
      .getDataRange()
      .getValues();

  if (
    values.length < 2
  ) {
    return [];
  }

  const headers =
    values[0].map(String);

  return values
    .slice(1)
    .filter(
      function(row) {
        return row.some(
          function(value) {
            return (
              value !== '' &&
              value !== null
            );
          }
        );
      }
    )
    .map(
      function(row, index) {
        const object = {
          __row:
            index + 2
        };

        headers.forEach(
          function(header, column) {
            object[header] =
              row[column];
          }
        );

        return object;
      }
    );
}


/* =========================================================
 * Settings
 * =======================================================*/

function getSetting_(key) {
  const row =
    rows_(CRAZY.S.SET)
      .find(
        function(item) {
          return (
            String(item.key) ===
            String(key)
          );
        }
      );

  return row
    ? String(row.value)
    : '';
}


function setSetting_(
  key,
  value
) {
  const sheet =
    sheet_(CRAZY.S.SET);

  const row =
    rows_(CRAZY.S.SET)
      .find(
        function(item) {
          return (
            String(item.key) ===
            String(key)
          );
        }
      );

  if (row) {
    sheet
      .getRange(
        row.__row,
        2
      )
      .setValue(
        String(value)
      );

    sheet
      .getRange(
        row.__row,
        3
      )
      .setValue(
        new Date()
      );
  }

  else {
    sheet.appendRow([
      key,
      String(value),
      new Date()
    ]);
  }
}


function setIfMissing_(
  key,
  value
) {
  if (
    getSetting_(key) === ''
  ) {
    setSetting_(
      key,
      value
    );
  }
}


/* =========================================================
 * Alert helper
 * =======================================================*/

function replaceAutoAlerts_(newAlerts) {
  const sheet =
    sheet_(CRAZY.S.ALERT);

  const keep =
    rows_(CRAZY.S.ALERT)
      .filter(
        function(alert) {
          return (
            ![
              'project',
              'local_task',
              'google_tasks',
              'calendar',
              'gmail'
            ]
            .includes(
              String(alert.source)
            )
          );
        }
      );

  sheet.clearContents();

  sheet
    .getRange(
      1,
      1,
      1,
      7
    )
    .setValues([
      [
        'id',
        'text',
        'project',
        'level',
        'source',
        'resolved',
        'updatedAt'
      ]
    ]);

  const rows = [];

  keep.forEach(
    function(alert) {
      rows.push([
        alert.id ||
        (
          'A-' +
          Utilities
            .getUuid()
            .slice(
              0,
              8
            )
        ),

        alert.text,

        alert.project,

        alert.level,

        alert.source,

        toBool_(
          alert.resolved
        ),

        new Date()
      ]);
    }
  );

  newAlerts.forEach(
    function(alert) {
      rows.push([
        'A-' +
        Utilities
          .getUuid()
          .slice(
            0,
            8
          ),

        alert.text,

        alert.project,

        alert.level,

        alert.source,

        false,

        new Date()
      ]);
    }
  );

  if (
    rows.length
  ) {
    sheet
      .getRange(
        2,
        1,
        rows.length,
        7
      )
      .setValues(
        rows
      );
  }
}


/* =========================================================
 * Logging
 * =======================================================*/

function log_(
  command,
  action,
  status,
  detail
) {
  try {
    sheet_(CRAZY.S.LOG)
      .appendRow([
        new Date(),

        String(
          command || ''
        ),

        String(
          action || ''
        ),

        String(
          status || ''
        ),

        String(
          detail || ''
        )
      ]);
  } catch (e) {}
}


function okReply_(
  command,
  reply,
  action
) {
  log_(
    command,
    action,
    'ok',
    String(reply)
      .slice(
        0,
        500
      )
  );

  return {
    ok: true,
    reply:
      reply,
    action:
      action
  };
}


/* =========================================================
 * Boolean helper
 * =======================================================*/

function toBool_(value) {
  return (
    value === true ||
    String(value)
      .toLowerCase() ===
      'true' ||
    String(value) ===
      '1'
  );
}


/* =========================================================
 * Trigger helper
 * =======================================================*/

function deleteTriggersByHandler_(handler) {
  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(trigger) {
        if (
          trigger
            .getHandlerFunction() ===
          handler
        ) {
          ScriptApp
            .deleteTrigger(
              trigger
            );
        }
      }
    );
}

