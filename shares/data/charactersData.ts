import type { ICharacterDTO } from '../character/ICharacter';

/**
 * 角色配置数据
 * Character configuration data
 */
export const charactersData: ICharacterDTO[] = [
  {
    id: 'char_survivor_01',
    name: '艾米莉',
    nickname: '影行者',
    portrait: 'https://example.com/portraits/emily.png',
    scrollImage: 'https://example.com/scrolls/emily.png',
    intro: '擅长潜行和侦查的求生者，能够在黑暗中悄无声息地移动。',
    specialSkillTitle: '暗影步伐',
    skill1: {
      title: '静音移动',
      desc: '移动时噪音减少50%，持续10秒',
      icon: 'https://example.com/skills/stealth.png',
    },
    skill2: {
      title: '敏锐感知',
      desc: '可以感知20米内的危险和线索',
      icon: 'https://example.com/skills/sense.png',
    },
    faction: 'Survivor',
    defaultUnlocked: true,
    gameplayRoleId: 'emily_survivor',
  },
  {
    id: 'char_survivor_02',
    name: '托马斯',
    nickname: '工匠',
    portrait: 'https://example.com/portraits/thomas.png',
    scrollImage: 'https://example.com/scrolls/thomas.png',
    intro: '经验丰富的工匠，擅长制作和修理各种工具。',
    specialSkillTitle: '巧手工艺',
    skill1: {
      title: '快速制作',
      desc: '制作速度提升30%',
      icon: 'https://example.com/skills/craft.png',
    },
    skill2: {
      title: '资源回收',
      desc: '失败时有50%几率返还材料',
      icon: 'https://example.com/skills/recycle.png',
    },
    faction: 'Survivor',
    defaultUnlocked: true,
    gameplayRoleId: 'thomas_survivor',
  },
  {
    id: 'char_survivor_03',
    name: '莉莉安',
    nickname: '医者',
    portrait: 'https://example.com/portraits/lilian.png',
    scrollImage: 'https://example.com/scrolls/lilian.png',
    intro: '医术高明的治疗者，能够快速救助队友。',
    specialSkillTitle: '治愈之手',
    skill1: {
      title: '快速治疗',
      desc: '治疗队友速度提升40%',
      icon: 'https://example.com/skills/heal.png',
    },
    skill2: {
      title: '坚韧',
      desc: '受伤后移动速度不受影响',
      icon: 'https://example.com/skills/endurance.png',
    },
    faction: 'Survivor',
    defaultUnlocked: false,
    gameplayRoleId: 'lilian_survivor',
  },
  {
    id: 'char_overseer_01',
    name: '影魔',
    nickname: '暗夜猎手',
    portrait: 'https://example.com/portraits/shadow.png',
    scrollImage: 'https://example.com/scrolls/shadow.png',
    intro: '来自黑暗深处的恐怖存在，以追捕幸存者为乐。',
    specialSkillTitle: '暗影之力',
    skill1: {
      title: '暗夜疾行',
      desc: '移动速度提升20%，持续8秒',
      icon: 'https://example.com/skills/speed.png',
    },
    skill2: {
      title: '恐惧光环',
      desc: '周围15米内玩家移动速度降低10%',
      icon: 'https://example.com/skills/fear.png',
    },
    faction: 'Overseer',
    defaultUnlocked: false,
    gameplayRoleId: 'shadow_overseer',
  },
  {
    id: 'char_overseer_02',
    name: '腐化者',
    nickname: '瘟疫使者',
    portrait: 'https://example.com/portraits/plague.png',
    scrollImage: 'https://example.com/scrolls/plague.png',
    intro: '散播疾病和恐惧的邪恶力量，能够削弱幸存者。',
    specialSkillTitle: '瘟疫之触',
    skill1: {
      title: '毒雾',
      desc: '释放毒雾，减缓区域内幸存者速度',
      icon: 'https://example.com/skills/poison.png',
    },
    skill2: {
      title: '感染',
      desc: '攻击使目标中毒，持续受到伤害',
      icon: 'https://example.com/skills/infect.png',
    },
    faction: 'Overseer',
    defaultUnlocked: false,
    gameplayRoleId: 'plague_overseer',
  },
];
