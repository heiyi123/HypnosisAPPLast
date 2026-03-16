// 催眠APP 变量更新脚本：监听 MVU 变量更新（可疑度/警戒度系统已移除，当前不再结算）
// 与「催眠APP脚本」分离：本脚本不提供打开前端的按钮，仅负责变量逻辑。
function getMessageVariableOption(): VariableOption {
  try {
    return { type: 'message', message_id: getCurrentMessageId() };
  } catch {
    return { type: 'message', message_id: 'latest' };
  }
}

async function applyDailySettlement(mvu: Mvu.MvuData, before: Mvu.MvuData): Promise<boolean> {
  // 可疑度 / 警戒度系统已移除，本脚本暂不进行任何变量结算。
  void mvu;
  void before;
  return false;
}

$(() => {
  (async () => {
    try {
      await waitGlobalInitialized('Mvu');
    } catch (err) {
      console.warn('[催眠APP变量更新脚本] Mvu 未就绪，脚本不生效', err);
      return;
    }

    let isSelfApplying = false;

    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, async (after: Mvu.MvuData, before: Mvu.MvuData) => {
      if (isSelfApplying) {
        isSelfApplying = false;
        return;
      }

      try {
        const changed = await applyDailySettlement(after, before);
        if (!changed) return;

        isSelfApplying = true;
        await Mvu.replaceMvuData(after, getMessageVariableOption());
      } catch (err) {
        console.error('[催眠APP变量更新脚本] 每日结算失败', err);
        isSelfApplying = false;
      }
    });
  })();
});
