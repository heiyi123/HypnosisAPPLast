import { ArrowLeft, ShoppingBag } from 'lucide-react';
import React, { useState } from 'react';
import { DataService } from '../services/dataService';
import { MvuBridge } from '../services/mvuBridge';
import type { UserResources } from '../types';

interface ShopAppProps {
  userData: UserResources;
  onUpdateUser: (data: UserResources) => void;
  onBack: () => void;
}

type ShopItem = {
  id: string;
  name: string;
  price: number;
  description: string;
};

const SHOP_ITEMS: ShopItem[] = [
  // 实用类基础道具
  {
    id: 'gift_sweets_box',
    name: '高档点心礼盒',
    price: 5200,
    description: '包装精美的西式点心，所有人都不会讨厌。赠送可以略微提升好感度。',
  },
  {
    id: 'tool_spare_key',
    name: '万能钥匙',
    price: 9800,
    description: '经正规渠道制作的“多用途钥匙”，可以打开绝大多数门的锁。',
  },
  {
    id: 'gadget_master_keycard',
    name: '万能身份卡',
    price: 14800,
    description:
      '黑客制作的高危道具，可以干扰大部分由电子系统控制的门禁，让门在短时间内强制解锁，使用后报废。',
  },
  {
    id: 'gadget_pinhole_camera_singleuse',
    name: '针孔摄像机',
    price: 9800,
    description:
      '用于偷拍的小型装置，需要提前隐蔽安装。只能拍摄并保存一段影像，使用一次后即报废。',
  },
  {
    id: 'cos_small_prop',
    name: '简易伪装套装',
    price: 3400,
    description: '帽子、口罩与一次性染发喷雾的组合，用于在特定场合降低被认出的概率。',
  },

  // 情趣拘束道具
  {
    id: 'ero_vibrator_egg_remote',
    name: '跳蛋＆遥控器',
    price: 8800,
    description: '常见的情趣跳蛋与配套遥控器，可以远程操控震动强度与频率，适合在公共场合制造紧张感。',
  },
  {
    id: 'ero_handcuffs_soft',
    name: '手铐',
    price: 6500,
    description: '带绒垫的情趣用手铐，对皮肤相对友好，但结构牢固，女孩子基本无法独自挣脱。',
  },
  {
    id: 'ero_rope_set_knot',
    name: '绳子套装',
    price: 7200,
    description: '用于捆绑玩法的特制绳子套装，每隔一段距离有绳结，方便固定姿势与受力点。',
  },
  {
    id: 'ero_blindfold_basic',
    name: '眼罩',
    price: 2800,
    description: '柔软材质制成的情趣眼罩，彻底剥夺视觉，只能依靠触觉和听觉感知环境。',
  },
  {
    id: 'ero_gag_ball',
    name: '口塞',
    price: 4200,
    description: '经典球型情趣口塞，戴上之后不得不咬住球体，说话只能发出含糊的声音。',
  },
  {
    id: 'ero_mouth_opener',
    name: '开口器',
    price: 5600,
    description: '金属与皮带组合的情趣开口器，带上之后嘴巴会被强制撑开，几乎无法闭合。',
  },
  {
    id: 'ero_vibrator_wand',
    name: '震动棒',
    price: 9800,
    description: '高输出功率的情趣按摩棒，可以持续提供强烈震动，用途由使用者自行决定。',
  },

  // 猫系拘束套装
  {
    id: 'ero_cat_paw_gloves_lock',
    name: '猫抓手套',
    price: 8900,
    description:
      '特制的情趣手套，外观是毛绒猫抓。穿戴者必须手握拳伸入并上锁，双手都戴上后无法自行取下。',
  },
  {
    id: 'ero_cat_paw_boots',
    name: '猫抓靴子',
    price: 11200,
    description:
      '特制的情趣靴子，外观是毛绒猫抓。内置高跟与厚软垫，让穿戴者必须垫脚站立，行走时极易失衡摔倒。',
  },
  {
    id: 'ero_cat_tail_plug',
    name: '猫爪尾巴',
    price: 9600,
    description: '毛绒猫爪造型尾巴，末端是肛塞结构，插入后尾巴会自然垂在身后，极具羞耻感。',
  },

  // 项圈与宠物系
  {
    id: 'ero_collar_bell',
    name: '铃铛项圈',
    price: 4800,
    description: '带有精致小铃铛的情趣项圈，只要身体微微晃动就会发出清脆叮铃声，行动难以隐藏。',
  },
  {
    id: 'ero_collar_leash',
    name: '宠物项圈',
    price: 5200,
    description: '结实的皮质项圈，预留牵引绳连接环，用于进行“宠物”风格的玩法与引导行动。',
  },

  // 药物与全身拘束
  {
    id: 'drug_sleep_potion_halfday',
    name: '安眠药',
    price: 15800,
    description:
      '小瓶无色无味药水，可悄悄倒入饮料中。让目标熟睡约半天，期间几乎不会醒来。',
  },
  {
    id: 'ero_pet_bondage_suit',
    name: '宠物拘束衣',
    price: 24800,
    description:
      '成套皮质情趣拘束衣。穿戴者需将大腿小腿并拢、小臂大臂并拢才能穿好并上锁，最终只能像动物一样四肢行走。',
  },
];

export const ShopApp: React.FC<ShopAppProps> = ({ userData, onUpdateUser, onBack }) => {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const priceToPt = (price: number) => Math.ceil(price / 100);

  const handlePurchase = async (item: ShopItem) => {
    if (submittingId) return;
    const costPt = priceToPt(item.price);
    if (userData.ptPoints < costPt) {
      showNotice('PT 点不足，无法购买该物品');
      return;
    }

    setSubmittingId(item.id);
    try {
      const nextUser = await DataService.updateResources({
        ptPoints: userData.ptPoints - costPt,
      });
      onUpdateUser(nextUser);

      try {
        await MvuBridge.purchaseItem?.(item.name, item.description, 1);
        await MvuBridge.appendThisTurnAppOperationLog?.(`在商城购买「${item.name}」x1（-${costPt} PT）`);
      } catch (err) {
        console.warn('[HypnoOS] 物品写入 MVU 失败', err);
      }

      showNotice('购买成功，已加入持有物品');
    } catch (err) {
      console.warn('[HypnoOS] 购买物品失败', err);
      showNotice('购买失败，请稍后再试');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white animate-fade-in relative overflow-hidden">
      <div className="px-4 py-4 pt-6 flex items-center justify-between z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="text-gray-300" size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
              <ShoppingBag size={18} className="text-emerald-300" />
              商城
            </h1>
            <p className="text-xs text-gray-400">使用 PT 点购买预设道具，道具会写入系统的持有物品。</p>
          </div>
        </div>
        <div className="flex flex-col items-end text-xs text-gray-300">
          <div>
            当前 PT：
            <span className="font-bold text-emerald-300">{userData.ptPoints}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        {SHOP_ITEMS.map(item => {
          const costPt = priceToPt(item.price);
          const insufficient = userData.ptPoints < costPt;
          const busy = submittingId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white/90 truncate">{item.name}</div>
                <div className="text-xs text-gray-300 mt-1 leading-relaxed">{item.description}</div>
                <div className="text-xs text-emerald-300 mt-2">
                  价格：<span className="font-bold">{priceToPt(item.price)} PT</span>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <button
                  type="button"
                  disabled={insufficient || busy}
                  onClick={() => void handlePurchase(item)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all
                    ${insufficient || busy
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                      : 'bg-emerald-400 text-black hover:bg-emerald-300 active:scale-95'
                    }`}
                >
                  {busy ? '处理中...' : insufficient ? '余额不足' : '购买'}
                </button>
              </div>
            </div>
          );
        })}

        <div className="mt-4 text-[11px] text-gray-400 leading-relaxed">
          说明：商城中的商品为预设道具。购买后会自动加入你的持有物品，同名物品会累加数量，方便在剧情中使用。
        </div>
      </div>

      {notice && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs border border-white/10 shadow-lg backdrop-blur-sm">
          {notice}
        </div>
      )}
    </div>
  );
};

