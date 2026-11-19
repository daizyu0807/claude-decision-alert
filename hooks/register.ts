import type { Register } from 'claude-code'

const TIMEOUT_MS = 300_000
const BACK = '回到 session'

// 原生 NSAlert（JXA）：單選題＝上下鍵選取的清單＋Enter 送出；多選題＝核取方塊；權限＝允許／拒絕。
// 所有內容走 argv，不拼進腳本。輸出：被按的選項文字，或 BACK。
const JXA = `
ObjC.import('AppKit');
function label(t, size, bold, dim, w) {
  var f = $.NSTextField.wrappingLabelWithString($(t));
  f.setFont(bold ? $.NSFont.boldSystemFontOfSize(size) : $.NSFont.systemFontOfSize(size));
  if (dim) f.setTextColor($.NSColor.secondaryLabelColor);
  f.setPreferredMaxLayoutWidth(w);
  return f;
}
function vstack(spacing, w) {
  var s = $.NSStackView.alloc.initWithFrame($.NSMakeRect(0, 0, w, 10));
  s.setOrientation(1); s.setAlignment(1); s.setSpacing(spacing);
  s.widthAnchor.constraintEqualToConstant(w).active = true;
  return s;
}
function ask(argv) {
  var mode = argv[0], head = argv[1], body = argv[2], rest = argv.slice(3);
  var items = [];
  for (var i = 0; i + 1 < rest.length; i += 2) items.push({ t: rest[i], d: rest[i + 1] });
  var W = 360;
  var app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
  var a = $.NSAlert.alloc.init;
  a.setMessageText($(head));
  a.setInformativeText($(body));
  a.setAlertStyle(mode === 'perm' ? $.NSAlertStyleWarning : $.NSAlertStyleInformational);
  var ic = $.NSWorkspace.sharedWorkspace.iconForFile($('/Applications/Claude.app'));
  if (ic) a.setIcon(ic);
  var boxes = [], buttons;
  var matrix = null;
  if (mode === 'single' && items.length) {
    var gap = 6, pad = 26, cellH = 0, attrs = [];
    items.forEach(function (it) {
      var s = $.NSMutableAttributedString.alloc.init;
      s.mutableString.setString($(it.t + (it.d ? '\\n' + it.d : '')));
      s.addAttributeValueRange($.NSFontAttributeName, $.NSFont.boldSystemFontOfSize(13), $.NSMakeRange(0, it.t.length));
      if (it.d) {
        var r = $.NSMakeRange(it.t.length + 1, it.d.length);
        s.addAttributeValueRange($.NSFontAttributeName, $.NSFont.systemFontOfSize(12), r);
        s.addAttributeValueRange($.NSForegroundColorAttributeName, $.NSColor.secondaryLabelColor, r);
      }
      var h = s.boundingRectWithSizeOptions($.NSMakeSize(W - pad, 10000), 1).size.height + 6;
      if (h > cellH) cellH = h;
      attrs.push(s);
    });
    matrix = $.NSMatrix.alloc.initWithFrameModeCellClassNumberOfRowsNumberOfColumns(
      $.NSMakeRect(0, 0, W, items.length * cellH + (items.length - 1) * gap), 0, $.NSButtonCell, items.length, 1);
    matrix.setCellSize($.NSMakeSize(W, cellH));
    matrix.setIntercellSpacing($.NSMakeSize(0, gap));
    for (var j = 0; j < items.length; j++) {
      var c = matrix.cellAtRowColumn(j, 0);
      c.setButtonType(4);
      c.setWraps(true);
      c.setAttributedTitle(attrs[j]);
    }
    matrix.selectCellAtRowColumn(0, 0);
    a.setAccessoryView(matrix);
  } else if (items.length) {
    var stack = vstack(12, W);
    items.forEach(function (it) {
      var block = vstack(2, W);
      var b = $.NSButton.alloc.initWithFrame($.NSMakeRect(0, 0, W, 20));
      b.setButtonType(3); b.setTitle($(it.t)); b.setState(0);
      b.setFont($.NSFont.boldSystemFontOfSize(13));
      block.addArrangedSubview(b); boxes.push(b);
      if (it.d) {
        var d = label(it.d, 12, false, true, W - 20);
        var row = $.NSStackView.alloc.initWithFrame($.NSMakeRect(0, 0, W, 10));
        row.setOrientation(0); row.setEdgeInsets({ top: 0, left: 20, bottom: 0, right: 0 });
        row.addArrangedSubview(d);
        block.addArrangedSubview(row);
      }
      stack.addArrangedSubview(block);
    });
    stack.setFrameSize(stack.fittingSize);
    a.setAccessoryView(stack);
  }
  if (mode === 'multi') buttons = ['確定', '回到 session'];
  else if (mode === 'perm') buttons = ['允許', '拒絕', '回到 session'];
  else buttons = ['確定', '回到 session'];
  buttons.forEach(function (t) { a.addButtonWithTitle($(t)); });
  var chk = null, autoFile = $.NSHomeDirectory().js + '/.config/decision-alert/auto-allow';
  if (mode === 'perm') {
    chk = $.NSButton.alloc.initWithFrame($.NSMakeRect(0, 0, W, 22));
    chk.setButtonType(3); chk.setTitle($('5 秒後自動允許'));
    var saved = $.NSString.stringWithContentsOfFileEncodingError($(autoFile), $.NSUTF8StringEncoding, null);
    chk.setState(saved && saved.js.trim() === '1' ? 1 : 0);
    a.setAccessoryView(chk);
    var left = 5, allowBtn = a.buttons.objectAtIndex(0);
    ObjC.registerSubclass({ name: 'DATick', methods: { 'tick:': { types: ['void', ['id']], implementation: function (t) {
      if (chk.state != 1) { left = 5; allowBtn.setTitle($('允許')); return; }
      left--;
      if (left <= 0) { $.NSApp.stopModalWithCode(1000); return; }
      allowBtn.setTitle($('允許 (' + left + ')'));
    } } } });
    var timer = $.NSTimer.timerWithTimeIntervalTargetSelectorUserInfoRepeats(1, $.DATick.alloc.init, 'tick:', null, true);
    $.NSRunLoop.currentRunLoop.addTimerForMode(timer, $.NSRunLoopCommonModes);
  }
  app.activateIgnoringOtherApps(true);
  if (matrix) { a.layout; a.window.setInitialFirstResponder(matrix); a.window.makeFirstResponder(matrix); }
  var r = a.runModal - 1000;
  if (chk) {
    $.NSFileManager.defaultManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError($.NSHomeDirectory().js + '/.config/decision-alert', true, $(), null);
    $(chk.state == 1 ? '1' : '0').writeToFileAtomicallyEncodingError($(autoFile), true, $.NSUTF8StringEncoding, null);
  }
  if (r < 0 || r >= buttons.length) return '回到 session';
  var picked = buttons[r];
  if (mode === 'multi') {
    if (picked !== '確定') return '回到 session';
    var sel = [];
    boxes.forEach(function (b, i) { if (b.state == 1) sel.push(items[i].t); });
    return sel.length ? sel.join(', ') : '回到 session';
  }
  if (mode === 'single') return picked === '確定' ? items[matrix.selectedRow].t : '回到 session';
  return picked;
}
function run(argv) {
  var res = ask(argv);
  if (res === '回到 session') $.NSWorkspace.sharedWorkspace.launchApplication($('Claude'));
  return res;
}
`

// 回到 session：用 Claude 桌面版的深層連結切到「這個」session（你可能正在看別的 session）。
// 本 session 的 local id 從桌面版的 session 儲存檔名查出；查不到就只靠彈窗腳本把 app 帶到前景。
type Dollar = {
  process: { run: (argv: readonly string[]) => Promise<{ stdout: string }> }
  session: { id: () => Promise<string> }
}
const backToSession = async ($: Dollar) => {
  try {
    const sid = await $.session.id()
    const r = await $.process.run([
      'sh', '-c',
      'grep -rl "$0" "$HOME/Library/Application Support/Claude/claude-code-sessions" 2>/dev/null | head -1',
      sid,
    ])
    const m = r.stdout.trim().match(/(local_[A-Za-z0-9-]+)\.json$/)
    if (m) await $.process.run(['open', `claude://code/continue?session=${m[1]}&source=desktop_action`])
  } catch {
    /* 交回原本對話框即可 */
  }
}

const basename = (p: string) => p.split('/').filter(Boolean).pop() ?? p

const out = (r: { stdout: string; stderr: string }) => r.stdout.trim() || r.stderr.trim()

const describe = (tool: string, input: unknown): string => {
  const o = (input ?? {}) as Record<string, unknown>
  const main = o.command ?? o.file_path ?? o.url ?? o.pattern ?? JSON.stringify(input)
  return `${tool}\n${String(main).slice(0, 600)}`
}

export const register: Register = on => {
  // 只在你明確按「允許／拒絕」時代為決定；逾時、出錯、回到 session 都交回原本對話框，絕不自動允許。
  on('classic.PermissionRequest', async ($, e, next) => {
    // 這兩個工具的對話框本身就是互動（問題／計畫確認），不是權限；AskUserQuestion 由下方 tool.call 處理
    if (e.tool_name === 'AskUserQuestion' || e.tool_name === 'ExitPlanMode') return next(e)
    const head = `${basename(e.cwd)}｜需要你的許可${e.agent_id ? '（子代理）' : ''}`
    try {
      const r = await $.process.run(
        ['osascript', '-l', 'JavaScript', '-e', JXA, 'perm', head, describe(e.tool_name, e.tool_input)],
        { timeoutMs: 120_000 },
      )
      const a = out(r)
      if (a === '允許') return { decision: { behavior: 'allow' } }
      if (a === '拒絕') return { decision: { behavior: 'deny', message: '使用者在 decision-alert 彈窗拒絕' } }
    } catch {
      /* 交回原本對話框 */
    }
    await backToSession($)
    return next(e)
  })

  // 自動模式下最常見的「需要判斷」：模型用 AskUserQuestion 問你。
  // 選擇題直接在彈窗作答；文字／數字題、回到 session、逾時、出錯 → 交回原本對話框。
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    const project = basename(await $.session.cwd())
    const qs = e.questions
    const kindOf = (q: unknown) => (q as { kind?: string }).kind
    if (!qs?.length || qs.some(q => kindOf(q) && kindOf(q) !== 'choice')) {
      void $.ui.notify('需要你回答問題', { title: `Claude｜${project}` }).catch(() => {})
      return next(e)
    }
    const answers: Record<string, string> = {}
    for (const q of qs) {
      const head = `${project}｜${q.header}`
      const body = `${q.question}${q.multiSelect ? '（可多選）' : ''}`
      try {
        const r = await $.process.run(
          ['osascript', '-l', 'JavaScript', '-e', JXA, q.multiSelect ? 'multi' : 'single', head, body, ...q.options.flatMap(o => [o.label, o.description ?? ''])],
          { timeoutMs: TIMEOUT_MS },
        )
        const picked = out(r)
        if (!picked || picked === BACK) {
          await backToSession($)
          return next(e)
        }
        answers[q.question] = picked
      } catch {
        await backToSession($)
        return next(e)
      }
    }
    return { result: { questions: qs, answers } } as never
  })
}
