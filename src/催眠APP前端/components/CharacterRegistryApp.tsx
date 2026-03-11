import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { MvuBridge } from '../services/mvuBridge';

interface CharacterRegistryAppProps {
  onBack: () => void;
}

export const CharacterRegistryApp: React.FC<CharacterRegistryAppProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [age, setAge] = useState('');
  const [clazz, setClazz] = useState('');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');
  const [origin, setOrigin] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const buildContent = () => {
    const safe = (v: string, fallback: string) => v.trim() || fallback;
    const lines: string[] = [];
    lines.push(`＜「${name.trim()}」人设＞`);
    lines.push(`「${name.trim()}」:`);
    lines.push(`  身份: ${safe(identity, '（未填写，建议为 学生 / 教职工 / 其他）')}`);
    lines.push(`  年龄: ${safe(age, '（未填写）')}`);
    lines.push(`  班级: ${safe(clazz, '（未填写）')}`);
    lines.push(`  外貌: ${safe(appearance, '（未填写）')}`);
    lines.push(`  性格: ${safe(personality, '（未填写）')}`);
    lines.push(`  出处: ${safe(origin, '原创')}`);
    lines.push('  详细设定:');
    const trimmedDetail = detail.replace(/\r\n/g, '\n').trim();
    if (trimmedDetail) {
      for (const line of trimmedDetail.split('\n')) {
        lines.push(`    ${line}`);
      }
    } else {
      lines.push('    （未填写）');
    }
    return lines.join('\n');
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showNotice('请先填写姓名');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      // 1. 确保使用角色卡绑定的世界书（若无，则退回当前聊天世界书）
      const charBooks = getCharWorldbookNames('current');
      const worldbookName =
        charBooks.primary ??
        charBooks.additional[0] ??
        ((await getChatWorldbookName('current')) ?? (await getOrCreateChatWorldbook('current')));

      // 2. 在世界书中新增绿灯条目（人设 + 变量）
      const content = buildContent();
      await createWorldbookEntries(
        worldbookName,
        [
          {
            name: `${trimmedName}人设`,
            enabled: true,
            strategy: {
              type: 'selective',
              keys: [trimmedName],
              keys_secondary: { logic: 'and_any', keys: [] },
              scan_depth: 'same_as_global',
            },
            position: {
              type: 'before_character_definition',
              role: 'system',
              depth: 0,
              order: 90,
            },
            content,
            probability: 1,
            recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
            effect: { sticky: null, cooldown: null, delay: null },
          },
          {
            name: `${trimmedName}变量`,
            enabled: true,
            strategy: {
              type: 'selective',
              keys: [trimmedName],
              keys_secondary: { logic: 'and_any', keys: [] },
              scan_depth: 'same_as_global',
            },
            position: {
              type: 'before_character_definition',
              role: 'system',
              depth: 0,
              order: 35,
            },
            content: `${trimmedName}:\n  {{format_message_variable::stat_data.角色.${trimmedName}}}`,
            probability: 1,
            recursion: { prevent_incoming: true, prevent_outgoing: true, delay_until: null },
            effect: { sticky: null, cooldown: null, delay: null },
          },
        ],
        { render: 'debounced' },
      );

      // 3. 在 MVU 变量中创建该角色的变量（与固有角色模板一致）
      await MvuBridge.createRoleIfMissing(trimmedName, {
        好感度: 0,
        警戒度: 0,
        服从度: 0,
        性欲: 0,
        快感值: 0,
        阴蒂敏感度: 100,
        小穴敏感度: 100,
        菊穴敏感度: 150,
        尿道敏感度: 100,
        乳头敏感度: 100,
        临时催眠效果: {},
        永久催眠效果: {},
        阴蒂高潮次数: 0,
        小穴高潮次数: 0,
        菊穴高潮次数: 0,
        尿道高潮次数: 0,
        乳头高潮次数: 0,
      });

      showNotice('角色已录入');
      // 可选：清空表单，保留姓名方便连录
      // setName('');
      // setAge('');
      // setClazz('');
      // setAppearance('');
      // setPersonality('');
      // setOrigin('');
      // setDetail('');
    } catch (err) {
      console.warn('[HypnoOS] 角色录入失败', err);
      showNotice('角色录入失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white animate-fade-in relative overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 pt-6 flex items-center justify-between z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="text-gray-300" size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-wide">角色录入</h1>
            <p className="text-xs text-gray-400">用于快速录入同人角色的简化人设与变量</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        {/* 基本信息 */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400">基础信息</h2>
          <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-300">
                姓名 <span className="text-red-400">*</span>
              </span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：西园寺爱丽莎 / 某同人角色名"
                className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </label>

            <div className="flex gap-3">
              <label className="flex-1 flex flex-col gap-1 text-xs">
                <span className="text-gray-300">身份</span>
                <input
                  value={identity}
                  onChange={e => setIdentity(e.target.value)}
                  placeholder="建议：学生 / 教职工 / 其他"
                  className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </label>

              <label className="w-20 flex flex-col gap-1 text-xs">
                <span className="text-gray-300">年龄</span>
                <input
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="可不填"
                  className="bg-black/30 border border-white/20 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-300">班级</span>
              <input
                value={clazz}
                onChange={e => setClazz(e.target.value)}
                placeholder="例如：二年级C班，可不填"
                className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </label>
          </div>
        </section>

        {/* 设定字段 */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400">设定字段</h2>
          <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/10">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-300">外貌</span>
              <textarea
                value={appearance}
                onChange={e => setAppearance(e.target.value)}
                placeholder="同人角色可不填；原创角色可简单描述外貌特征"
                rows={2}
                className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-300">性格</span>
              <textarea
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                placeholder="同人角色可不填；可填写关键性格词，如：傲娇 / 病娇 / 冷静腹黑 等"
                rows={2}
                className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-300">出处</span>
              <input
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="同人角色填写原作作品名；原创角色可写「原创」"
                className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-gray-300">详细设定</span>
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="填写人物的详细性格、人际关系、恋爱关系等；同人角色可写与原作不同之处"
                rows={5}
                className="bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </label>
          </div>
        </section>
      </div>

      {/* Footer: Confirm Button */}
      <div className="px-4 pb-6 pt-3 bg-slate-900/90 border-t border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-lg transition-all
            ${
              submitting || !name.trim()
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:shadow-emerald-500/40 active:scale-95'
            }`}
        >
          <CheckCircle2 size={18} />
          确认录入
        </button>
      </div>

      {notice && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs border border-white/10 shadow-lg backdrop-blur-sm">
          {notice}
        </div>
      )}
    </div>
  );
};

