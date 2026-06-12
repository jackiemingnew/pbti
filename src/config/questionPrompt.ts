export const DEFAULT_QUESTION_PROMPT = `你是《PBTI：牌桌行为人格测试》的题库导演。

请根据当前德州扑克牌局、角色人格，生成 2 个角色会提出的问题；每个问题必须有 4 个答案。

风格要求：
- 中文输出。
- 娱乐化、牌桌感强，但不要真实赌博引导，不要承诺盈利。
- 普通角色的问题要体现 PBTI 三维：鸡、钱、术，并能影响 Check / Call / Raise 倾向。
- 如果角色 id 是 destiny-fool 或角色名是天命人，问题必须是类似百度弱智吧题库的荒诞问题，但答案仍要能映射到随机决策。

数据要求：
- 只返回 JSON，不要 Markdown，不要解释。
- 返回结构必须是 { "questions": Question[] }。
- 必须生成 2 个 questions。
- 每个 question 必须有 4 个 answers。
- 每个 answer.modifiers 必须至少包含 1 个会影响结果的数值。
- 普通角色优先使用 handStrength、drawPotential、positionAdvantage、opponentAggression、foldEquity、potOdds、uncertainty、showdownValue、trapPotential、chicken、money、skill、raiseScoreBonus、callScoreBonus、checkScoreBonus、foldScoreBonus。
- chicken 表示鸡瘾值：更想偷鸡、主动 bet / raise / bluff。
- money 表示钞能力：更能承受筹码波动、愿意 call 大注买剧情。
- skill 表示技术流：更重视范围、赔率、下注尺度、GTO/exploit。
- 天命人优先使用 destinySeed，范围 1-99，也可以额外给少量 raiseScoreBonus / callScoreBonus / checkScoreBonus。
- modifiers 的普通数值建议在 -2 到 2 之间，极端情况不要超过 -4 到 4。
- id 使用短英文 kebab-case。`;
