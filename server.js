// 佛學知識王 —— 後端伺服器 (Node 內建 http + 內建 SQLite,零依賴)
// 啟動:  node --no-warnings server.js
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DB_PATH = join(__dirname, 'foxue.db');

/* ---------- 題組(分類)定義 ---------- */
const LEVELS = ['煩惱診療室', '熟悉又陌生的詞彙', '翻轉傳統迷思', '佛系密碼大解謎'];
const DEFAULT_LEVEL = '煩惱診療室';

/* ---------- 預設題庫(第一次啟動時寫入資料庫) ----------
   欄位: 題目, A, B, C, D, 正解(0~3), 分類, 解說                */
const DEFAULT_QUESTIONS = [
  /* ===== 煩惱診療室(生活情境) ===== */
  ["期中考考差了，你開始覺得「我是不是什麼都做不好？」比較適合提醒自己的是？",
   "一次失敗不代表全部","乾脆不要再考了","別人一定都比我強","假裝這次沒發生",0,"煩惱診療室",
   "【延伸觀念：正面思考】一次結果不代表整個自己。佛法提醒我們看清問題、調整方法，而不是被一次失敗困住。"],
  ["大一剛開學還交不到朋友，你開始擔心「我四年都會這樣」。比較適合怎麼想？",
   "現在不適應，不代表以後也一樣","第一個月沒朋友就沒救了","一定要逼自己參加所有活動","乾脆不要認識新朋友",0,"煩惱診療室",
   "【延伸觀念：無常】「無常」就是事情會改變。現在的生活、人際關係和心情，都不一定會永遠保持原樣。"],
  ["明天要交報告，但你一直滑手機停不下來。現在最適合做什麼？",
   "先把注意力拉回眼前的報告","等有動力再開始","一邊滑手機一邊寫","先想自己一定寫不完",0,"煩惱診療室",
   "【延伸觀念：制心一處】心很容易被外界帶走。發現自己分心時，再把注意力帶回正在做的事情，就是一種練習。"],
  ["報告、考試、社團全擠在一起，你一想到就很焦慮。比較適合怎麼做？",
   "先做好眼前最重要的一件事","一次把所有事情一起做","先逃避到最後一天","一直想自己一定做不完",0,"煩惱診療室",
   "【延伸觀念：專注當下】當事情很多時，不需要一次處理全部。先把心放在眼前能做的一步，反而比較容易往前。"],
  ["看到同學一直分享實習、交換、得獎，你開始覺得自己很差。這時比較適合？",
   "回頭看看自己的步調和方向","馬上跟對方比較更多","覺得自己一定落後了","為了贏過他把行程塞滿",0,"煩惱診療室",
   "【延伸觀念：觀照自心】別人的成果不等於自己的失敗。先看見自己的比較心，再回到自己的方向，比一直跟著別人跑更重要。"],
  ["你很努力準備面試，最後還是沒錄取。比較適合怎麼看？",
   "結果受到很多條件影響","努力沒用","一定是自己很差","以後都不要再嘗試",0,"煩惱診療室",
   "【延伸觀念：因緣】一件事的結果通常由很多條件共同造成。自己的努力很重要，但不代表能控制所有結果。"],
  ["和朋友吵架後，你一直反覆想對方說過的話，越想越生氣。比較適合怎麼做？",
   "發現自己又在想，再把心帶回現在","繼續想直到更生氣","馬上發文抱怨","找人證明自己一定是對的",0,"煩惱診療室",
   "【延伸觀念：覺察自己的心】情緒出現很正常，重要的是先發現自己正在被情緒帶著走。看見它，才有機會選擇下一步。"],
  ["父母、朋友、學長姐都對你的未來有不同意見，你越聽越亂。比較適合怎麼做？",
   "聽可靠的建議，再自己判斷","誰最有自信就聽誰的","完全照別人的人生走","誰的意見都不要聽",0,"煩惱診療室",
   "【延伸觀念：善知識】「善知識」是能給我們正確提醒和幫助的人。可以聽別人的經驗，但最後還是要學會自己思考。"],
  ["最近很沒動力，覺得每天上課、交作業都不知道為了什麼。這時可以先做什麼？",
   "想想自己真正想往哪裡走","等動力自己回來","什麼都不要做","看別人在做什麼就跟著做",0,"煩惱診療室",
   "【延伸觀念：願力】有時候不是沒有能力，而是忘了自己為什麼出發。重新找到想前往的方向，可以幫助自己慢慢恢復行動。"],
  ["你選了很多課、社團又打工，結果每天都累到不行。比較適合怎麼調整？",
   "找到努力和休息的平衡","再多塞一點事情","所有事情全部放棄","撐下去就好，不需要休息",0,"煩惱診療室",
   "【延伸觀念：中道】「中道」提醒我們不要走到極端。努力和休息都需要，找到能長久維持的方式，比硬撐更重要。"],
  ["台大中智社的上課時間是？",
   "星期四晚上七點到九點","星期二晚上六點到八點","星期三晚上七點半到九點半","星期一晚上六點半到九點",3,"煩惱診療室",
   "【基本題】台大中智社的上課時間是星期一晚上六點半到九點，歡迎大家來上課！"],
  ["台大中智社是哪個道場在台大的社團？",
   "中台禪寺","法鼓山","佛光山","慈濟",0,"煩惱診療室",
   "【基本題】台大中智社是位於南投縣埔里鎮的中台禪寺在台大的社團，由出家法師親自授課喔！"],

  /* ===== 熟悉又陌生的詞彙(日常用語) ===== */
  ["我們常說「世界」，但你知道嗎？「世界」一詞最早源自佛教經典。在佛教中「世」和「界」分別代表什麼意思？",
   "世＝世俗，界＝界線","世＝時間，界＝空間","世＝人類，界＝大自然","世＝地球，界＝宇宙",1,"熟悉又陌生的詞彙",
   "大家常以為「世界」是西方人的名詞，其實它是純正的佛教詞彙！「世」指的是過去、現在、未來（時間）；「界」指的是東南西北上下等十方（空間）。"],
  ["遇到太離奇的事我們會驚呼「太不可思議了！」在佛教中，「不可思議」原本是用來形容什麼？",
   "法術","智慧與境界深奧，無法用語言來思考與衡量","死後的世界","宇宙黑洞的奧秘",1,"熟悉又陌生的詞彙",
   "我們把「不可思議」用作「好誇張、好神奇」的代名詞，但它原來是指佛法的智慧與境界不可思、不可議，人類難以觸及思維，也難以用語言表達。"],
  ["形容說話浮誇不實，我們常說講得「天花亂墜」。這個成語在佛教典故中，原本的意思其實是？",
   "佛陀說法極為精妙，感動天神降下花雨","為了干擾修行而製造的幻象","指人說謊會遭到天上降下的花朵砸頭懲罰","寺廟彩繪因年久失修而剝落的樣子",0,"熟悉又陌生的詞彙",
   "這是一個被污名化的成語！現在多用來罵人吹牛、畫大餅。《大乘本生心地觀經》記載「六欲諸天來供養，天華亂墜遍虛空」，形容佛陀在王舍城耆闍崛山說法時，天神降下種種香花供養的莊嚴景象。"],
  ["現代人常說對某人佩服得「五體投地」。這個詞原本在佛教中指的是什麼？",
   "禪修打坐的姿勢","處罰犯戒僧人的方式","對佛菩薩最恭敬的禮拜動作","極度疲累整個人攤在地上的樣子",2,"熟悉又陌生的詞彙",
   "很多人以為「五體投地」是一種極度佩服的心理狀態，但它其實是「物理動作」！指的是雙膝、雙肘、額頭這五個部位都貼在地上，是佛教中最恭敬虔誠的頂禮方式。"],
  ["我們會勸人不要太「執著」。佛教認為「執著」是痛苦的根源，是因為世間萬物都具有什麼樣的特性？",
   "都是魔鬼的誘惑","都是永恆不變的","都是對立、不斷變化、無法真正擁有的","都是金錢不夠所導致的",2,"熟悉又陌生的詞彙",
   "有人以為佛教說的不要執著，是叫人擺爛、什麼都不要。其實佛教只是點出一個客觀事實：萬物都是「無常」的。青春會消逝、感情會變質、生命會結束，如果緊抓著不放，就會產生各種痛苦。"],
  ["遇到貴人我們會說「三生」有幸，這裡的「三生」在佛教中指的是什麼？",
   "生存、生活、生命","卵生、胎生、化生","爺爺、爸爸、兒子","前生、今生、來生",3,"熟悉又陌生的詞彙",
   "我們常把「三生有幸」當客套話，但它其實包含了佛教的「輪迴」觀念。意思是能結下這個善緣，是累積了過去、現在、未來三輩子的福報呢！"],
  ["朋友遇到挫折，我們常用「隨緣」二字安慰他。但在佛教的觀念中，「隨緣」的意思其實是？",
   "兩手一攤什麼都不做","盡自己最大的努力，但對最終的結果不強求、不執著","隨自己的心意做決定","把問題交給神明決定",1,"熟悉又陌生的詞彙",
   "現代人常把「隨緣」當成隨便、不再努力的藉口。其實佛教的「隨緣」非常積極：前面的準備（因）盡百分之百的努力，但對最終的結果（果）能坦然接受，不因為失敗而痛苦。"],
  ["大家熟知的寓言故事「盲人摸象」其實出自佛教《大般涅槃經》。佛陀說這個故事主要是為了闡述什麼道理？",
   "殘疾人士生活困苦要多體諒","大象是很危險的動物不要隨意靠近","往往只了解事物的一部分，就以為是全部","遇到不懂的事要多接觸並實踐",2,"熟悉又陌生的詞彙",
   "你是不是也以為這只是童話故事呢？其實它出自《大般涅槃經》卷三十：有人摸到象牙、有人摸到象腿、有人摸到象尾，各自以為摸到的就是大象而起爭執，比喻眾生的無明。我們常憑著有限的認知解讀世界，在沒看清全貌前就與人爭執。"],
  ["在路上遇到親切的推銷，對方送你面紙，說要跟你「結緣」。那「結緣」是什麼意思呢？",
   "免費贈送便宜的小禮物","建立良好的人際與善意連結，種下善的種子","強迫你買東西的客套話","幫忙介紹男女朋友",1,"熟悉又陌生的詞彙",
   "現在「結緣品」好像變成了免費贈品的代名詞。但「結緣」其實是指透過一個小小的善意（一句話、一個微笑、一本書），跟對方結下善的緣分，也許未來某一天就會開花結果。"],
  ["老師常念叨上課不專心的同學不要「心猿意馬」。這個成語源自佛教經典，為什麼要用「猴子」和「馬」來比喻呢？",
   "因為這兩種動物在古印度被視為神獸","比喻人的心念就像猴子亂跳、野馬狂奔一樣","佛陀曾經養過的兩種動物","形容人像動物一樣沒有開化、不懂禮貌",1,"熟悉又陌生的詞彙",
   "這其實是佛教形容「人類意識」的生動詞彙！我們的心念一刻也停不下來，前一秒想著午餐吃什麼，下一秒又想到昨天的遊戲，就像在樹叢間跳來跳去的猴子（心猿），和一匹不受控制的野馬（意馬）。修行的第一步，就是馴服牠們，讓心專注安定下來。"],

  /* ===== 翻轉傳統迷思(民俗觀念) ===== */
  ["講到「無常」，大家腦海中浮現的多是黑白無常，覺得不吉利、是死亡的代表。但佛教說的「無常」其實非常正面，請問是什麼？",
   "告訴我們命運是注定無法改變的","告訴我們好的壞的都不會永遠持續，一定會過去","代表大限將至","警告我們鬼神隨時在身邊",1,"翻轉傳統迷思",
   "「無常」只是客觀描述「世間萬物都在改變」的事實。也正因為無常，壞的狀況不會永遠壞下去！只要我們肯努力，所有事情都有可能改變。無常其實是充滿希望的。"],
  ["民間七月普渡會準備豐盛的三牲四果請好兄弟。這最初源自佛教的「盂蘭盆節」，你知道原本是為了供養誰嗎？",
   "清淨僧眾（出家人）","祖先","看不見的餓鬼","玉皇大帝",0,"翻轉傳統迷思",
   "民間普渡的主角是好兄弟。但在佛教盂蘭盆節的典故中，目連尊者為救母親，佛陀告訴他必須藉由十方大眾與僧團在農曆七月十五日（佛歡喜日）的修行功德，準備百味飲食供養三寶，再迴向解救七世父母。所以原本是請出家人吃飯，後來演變成請好兄弟吃飯。"],
  ["喪禮中我們常請法師來「做七」（頭七、二七到滿七）。這個習俗是基於佛教的什麼觀念？",
   "為了配合法師的上班時間","為了讓家屬有時間分配遺產","數字七代表吉利","亡者在死後到投胎前的「中陰身」階段通常為期四十九天",3,"翻轉傳統迷思",
   "「做七」是純正的佛教觀念。人死後到下一次投胎前有一個過渡期稱為「中陰身」，這個階段每七天經歷一次生死變化，最長四十九天就會決定下一生的去處。所以佛教提倡在這段關鍵時期為亡者誦經植福，幫助他們投生善道。"],
  ["許多長輩吃素是為了還願，或怕殺生有報應。但佛教提倡吃素（護生）最核心的出發點是什麼？",
   "為了減肥與身體健康","為了累積功德好中樂透","基於「慈悲心」，不忍眾生受苦","因為佛陀討厭吃肉",2,"翻轉傳統迷思",
   "很多民間信仰把吃素當成交易條件（神明讓我考上就吃素一個月），或出於恐懼（吃肉會下地獄）。但佛教提倡素食的核心非常單純，就是「慈悲」：知道動物被殺會痛、會恐懼，於心不忍所以選擇不吃。出發點是愛，而不是交換或恐懼。"],
  ["民間有「十八層地獄」的說法，認為做壞事會被分層處罰。佛教認為決定你下地獄的原因是什麼？",
   "由閻羅王做決定","自己造作的惡業所產生的自然結果，不由任何人判決","沒錢賄賂牛頭馬面","生前沒有捐錢給寺廟",1,"翻轉傳統迷思",
   "民間信仰受古代官府影響，認為地獄像監獄、有判官會審判你。但在佛教的教義中，沒有人會「判」你下地獄。地獄並非由閻羅王或鬼差主宰判決，而是由自身所造作的惡業力所牽引變現。"],
  ["我們常說「希望菩薩保佑我賺大錢、度過難關」。但在佛教中，「菩薩（菩提薩埵）」真正的定義是什麼？",
   "專門幫人實現願望的神仙","佛教裡的基層神明","發願自己要覺悟，同時也要幫助所有眾生一起覺悟的修行者","管理寺廟財務的僧人",2,"翻轉傳統迷思",
   "大家常把菩薩當成有求必應的神燈，或某種職位。其實「菩薩」是梵文 Bodhisattva 的音譯，Bodhi 是覺悟、sattva 是眾生。只要你發起一個願心：「我不只要自己斷除煩惱，還要盡我所能幫助別人一起離苦得樂」，你也是一位菩薩了！菩薩不是用來拜的，是讓我們去效法的。"],
  ["民間拜拜常大量焚燒金紙，甚至有摺紙蓮花、紙房子的習俗。在佛教的觀念裡，對於燒紙錢的態度是什麼？",
   "燒越多，在陰間越有錢","紙錢不環保，應該改用匯款","把真實的功德迴向給亡者才有益","只燒印有佛像的紙錢",2,"翻轉傳統迷思",
   "燒紙錢其實是中國古代民間的習俗，佛教是完全不燒紙錢的。佛教認為以亡者的名義去助人、印經，把這種真實的善業功德迴向給亡者，才是最實際也最有幫助的。"],
  ["過年時大家習慣到廟裡「點光明燈」求平安。佛教中也有點燈的習俗，它象徵的意義是什麼？",
   "寺廟的年度保護費","佔一個好位子","怕佛菩薩看不清我們","點燃內心的「智慧之光」",3,"翻轉傳統迷思",
   "在佛教經典中，燈代表著光明與智慧。點燈不是為了賄賂神明換取好運，而是藉由點燃外在的燈火，提醒自己要點亮內心的智慧之光，看清事物的真相，不要在煩惱與愚癡（無明）中迷路。"],
  ["民間常有買鳥、買魚到野外「放生」祈福積功德的活動。現代佛教更提倡什麼觀念，才是真正契合佛陀本意的「護生」？",
   "隨緣救助有困難的生命","放生的越多，功德就越大","專門買動物來放生","把家中寵物放生到山上",0,"翻轉傳統迷思",
   "傳統「買動物來放」的做法，往往導致商人為了利益抓更多動物，甚至造成生態浩劫（例如把淡水龜丟進海裡），反而變成「放死」。放生的本意是慈悲：在日常生活中隨緣救助生命、支持動物保護，或者少吃點肉，這些才是真正有智慧、不造業的護生。"],
  ["遇到人生迷惘時，民間習慣到廟裡擲筊或抽籤問神明。但正信的佛教其實不鼓勵算命與抽籤，這是為什麼？",
   "佛菩薩太忙了，沒空管","命運是神明決定的","抽籤會洩漏天機","命運在自己過去與現在的「行為」中",3,"翻轉傳統迷思",
   "正信佛教強調「因緣果報」，也就是種瓜得瓜、種豆得豆。我們的未來是由自己當下的行為與選擇所決定的。與其把命運交給未知的神明或籤詩，佛教更鼓勵從當下開始存好心、做好事，用積極的行動來改變未來。"],

  /* ===== 佛系密碼大解謎(專有名詞) ===== */
  ["日常生活中表示時間極為短暫的「剎那」，其實是源自哪裡的詞彙？",
   "古代中國天文學","西方物理學","梵語音譯","易經算命術語",2,"佛系密碼大解謎",
   "「剎那」聽起來像中文，其實它是古印度梵文 Kṣaṇa 的音譯！用來表達時間的最小單位，說明世間萬物在每一剎那都在生滅變化（無常）。"],
  ["我們常聽到佛教用語「六根清淨」，這裡的「六根」究竟是指哪六種？",
   "喜、怒、哀、樂、愛、惡","眼、耳、鼻、舌、身、意","色、聲、香、味、觸、法","貪、瞋、痴、慢、疑、欲",1,"佛系密碼大解謎",
   "「六根」是指眼、耳、鼻、舌、身、意，也就是我們接觸外界與產生感受的六種感官功能。《妙法蓮華經》卷六就提到「眼根清淨；耳、鼻、舌、身、意根清淨」，後來也常被用來形容遠離世俗慾念、心境清淨。"],
  ["我們常說「四大皆空」，佛教所說的「四大」是指哪四種構成物質的基本元素？",
   "金、木、水、火","地、水、火、風","天、地、人、神","東、西、南、北",1,"佛系密碼大解謎",
   "佛教所說的「四大」是地、水、火、風，用來代表構成物質世界的四種基本元素。「四大皆空」是說這些元素都是因緣聚合而成，並沒有永恆不變的自性，並不是指世界上什麼都沒有。"],
  ["每次運氣不好或遇到渣男渣女，大家就會自嘲「業障」重。在佛教中，「業障」的意思到底是什麼？",
   "被惡鬼纏身","神明對我們的懲罰","過去自己行為所造成的結果","怪自己太倒霉",2,"佛系密碼大解謎",
   "大家常把「業障」當成某種外來的詛咒。其實「業」就是行為（包含身、口、意），業障就是我們過去的行為所產生的後遺症（障礙），也就是因果。沒有神明在懲罰你，一切都是自己造的因所要承擔的果；當然我們也有能力透過改變現在的行為來改變未來。"],
  ["看到房間打掃得很乾淨，我們會稱讚「一塵不染」。但在佛教原本的造詞中，「一塵不染」的「塵」指的並不是灰塵，而是什麼？",
   "會污染內心清淨的誘惑","凡夫俗子的俗氣","前世帶來的業障","飄浮在空氣中的病菌",0,"佛系密碼大解謎",
   "現代人把一塵不染當成「物理上的乾淨」。但在佛教中，「塵」指的是色、聲、香、味、觸、法這六種會引發貪念與煩惱的外界刺激（六塵）。所以一塵不染原本是形容修行人的心靈非常純粹，不被外界的物欲與誘惑干擾、污染。"],
  ["在台灣，看到出家人或參加喪禮時，大家常會念一句「阿彌陀佛」。這四個字在梵文中的原意其實非常美好，請問是什麼？",
   "祝你早日投胎","無量的光明（智慧）與無量的壽命（福報）","驅除惡鬼的專用咒語","超度的心法口訣",1,"佛系密碼大解謎",
   "因為影視作品常在喪葬場合配上這句佛號，導致很多人覺得「阿彌陀佛」不吉利。其實「阿彌陀（Amita）」是梵文「無量」的意思，代表著無量的光明與壽命。所以見面時互道一句阿彌陀佛，其實是在給對方最頂級的祝福喔！"],
  ["在網路上，「三寶」常被用來戲稱不遵守交通規則的駕駛。但在佛教中，「三寶」指的是哪三樣事物？",
   "佛、法、僧","金、銀、琉璃","經、律、論","香、花、燈",0,"佛系密碼大解謎",
   "佛教的三寶是佛（覺悟者）、法（真理教導）、僧（清淨的修行團體）。因為這三者能引導人們走向覺悟解脫，極為珍貴，所以稱為三寶。這也是佛教徒信仰的核心，跟馬路上的三寶完全無關喔！"],
  ["看仙俠劇常聽到神仙要「渡劫」，或是形容大災難為「浩劫」。在佛教中，「劫」其實是用來計算什麼的單位？",
   "罪惡的重量","空間的距離","極度漫長的時間","法力的高低",2,"佛系密碼大解謎",
   "「劫（Kalpa）」其實是古印度的時間單位！用來形容一段極度漫長、長到無法用年月來計算的時間（例如宇宙從誕生到毀滅的一次循環）。佛教常說菩薩修行要經歷「三大阿僧祇劫」，就是在表達成佛需要無比漫長的時間積累。"],
  ["佛教有一部非常有名的經典《般若波羅蜜多心經》。這裡的「般若」（音同：波惹）指的是什麼？",
   "看透宇宙人生真相的終極大智慧","日本傳說中會吃人的女鬼面具","能治百病的仙界草藥","佛陀出家前的名字",0,"佛系密碼大解謎",
   "很多人受到日本次文化的影響，以為「般若」是某種可怕的鬼怪。其實它是梵文 Prajñā 的音譯，指的是一種超越世俗聰明才智的大智慧，能看破世間一切現象都是「無常」與「空」，進而放下執著。"],
  ["我們常聽人說「要有慈悲心」。佛教把「慈」跟「悲」放在一起，這兩個字各自有精確的分工，請問是什麼？",
   "慈＝捐錢，悲＝捐物資","慈＝帶給眾生快樂，悲＝拔除眾生的痛苦","慈＝對長輩孝順，悲＝對晚輩同情","慈＝溫柔的講話，悲＝傷心地流淚",1,"佛系密碼大解謎",
   "現代人常把慈悲當成「可憐別人」或「爛好人」。但佛教的定義非常明確：「慈」是希望給予對方幸福與快樂，「悲」是希望幫助對方脫離痛苦。這是一種充滿行動力、無私的愛心，而不是單純的同情而已。"],
];

/* ---------- 預設題庫的解說(以題目文字對應) ----------
   ‧ 玩家每答完一題會看到這段解說
   ‧ 自己新增的題目請到後台 /admin 的第 8 欄填寫             */
const DEFAULT_EXPLAIN = Object.fromEntries(
  DEFAULT_QUESTIONS.map(r => [r[0], r[7] || '']));

/* ---------- 資料庫初始化 ---------- */
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    question   TEXT NOT NULL,
    opt_a      TEXT NOT NULL,
    opt_b      TEXT NOT NULL,
    opt_c      TEXT NOT NULL,
    opt_d      TEXT NOT NULL,
    answer     INTEGER NOT NULL,
    level      TEXT NOT NULL DEFAULT '煩惱診療室',
    explanation TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// 舊資料庫升級:若沒有 level 欄位就補上(題組功能)
const cols = db.prepare('PRAGMA table_info(questions)').all().map(c => c.name);
if (!cols.includes('level')) {
  db.exec(`ALTER TABLE questions ADD COLUMN level TEXT NOT NULL DEFAULT '煩惱診療室'`);
}
// 舊資料庫升級:補上 explain 欄位(每題解說)
if (!cols.includes('explanation')) {
  db.exec(`ALTER TABLE questions ADD COLUMN explanation TEXT NOT NULL DEFAULT ''`);
}
// 舊資料庫升級:題目不再有「分類」屬性,有這個欄位就順手拿掉
if (cols.includes('category')) {
  try { db.exec('ALTER TABLE questions DROP COLUMN category'); } catch { /* 舊版 SQLite 不支援就留著,不影響功能 */ }
}
// 內建題目若還沒有解說就補上;自己寫過的解說不會被蓋掉
function backfillExplain() {
  const rows = db.prepare(`SELECT id, question FROM questions WHERE explanation = ''`).all();
  if (!rows.length) return 0;
  const upd = db.prepare('UPDATE questions SET explanation = ? WHERE id = ?');
  let n = 0;
  db.exec('BEGIN');
  try {
    rows.forEach(r => { const e = DEFAULT_EXPLAIN[r.question]; if (e) { upd.run(e, r.id); n++; } });
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return n;
}

// 一題可屬於多個分類。level 欄位以逗號分隔儲存,例如 "煩惱診療室,翻轉傳統迷思"。
function normOneLevel(v) {
  const s = String(v || '').trim();
  if (LEVELS.includes(s)) return s;
  if (s === '煩' || s === '1' || s === '生活情境') return '煩惱診療室';
  if (s === '詞' || s === '2' || s === '日常用語') return '熟悉又陌生的詞彙';
  if (s === '迷' || s === '3' || s === '民俗觀念') return '翻轉傳統迷思';
  if (s === '密' || s === '4' || s === '專有名詞') return '佛系密碼大解謎';
  return null;
}
// 任意輸入(陣列或以 , / 、+ 空白 分隔的字串)→ 正規化後的分類陣列(去重、依分類順序排序)
function normLevels(v) {
  let parts = Array.isArray(v) ? v : String(v || '').split(/[,\/、+\s]+/);
  const set = new Set();
  parts.forEach(p => { const l = normOneLevel(p); if (l) set.add(l); });
  const arr = LEVELS.filter(l => set.has(l));
  return arr.length ? arr : [DEFAULT_LEVEL];
}
const levelsToStr = arr => normLevels(arr).join(',');
// 讀資料庫用:空字串 → 空陣列(代表不屬任何題組),不套用預設
function parseLevels(str) {
  const set = new Set();
  String(str || '').split(/[,\/、+\s]+/).forEach(p => { const l = normOneLevel(p); if (l) set.add(l); });
  return LEVELS.filter(l => set.has(l));
}

function seedDefaults() {
  const insert = db.prepare(
    `INSERT INTO questions (question,opt_a,opt_b,opt_c,opt_d,answer,level,explanation,sort_order)
     VALUES (?,?,?,?,?,?,?,?,?)`);
  db.exec('BEGIN');
  DEFAULT_QUESTIONS.forEach((r, i) => insert.run(
    r[0], r[1], r[2], r[3], r[4], r[5], levelsToStr(r[6]), DEFAULT_EXPLAIN[r[0]] || '', i));
  db.exec('COMMIT');
}
// 若資料表為空,寫入預設題庫
if (db.prepare('SELECT COUNT(*) AS n FROM questions').get().n === 0) seedDefaults();
backfillExplain();   // 既有資料庫:把內建題目缺的解說補上

/* ---------- 排行榜資料表 ---------- */
const BOARD_SIZE = 20;            // 前 20 名才上榜
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    score      INTEGER NOT NULL,
    level      TEXT NOT NULL DEFAULT '煩惱診療室',
    mode       TEXT NOT NULL DEFAULT 'solo',
    correct    INTEGER NOT NULL DEFAULT 0,
    total      INTEGER NOT NULL DEFAULT 0,
    max_combo  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_scores_board ON scores(level, score DESC, id);
`);

const rowToScore = r => ({ id: r.id, name: r.name, score: r.score, level: r.level,
  mode: r.mode, correct: r.correct, total: r.total, combo: r.max_combo, at: r.created_at });

// 名次:同分時先上榜的排前面(所以用 >= 計算新分數會落在哪一名)
function rankOf(level, score) {
  return db.prepare('SELECT COUNT(*) AS n FROM scores WHERE level = ? AND score >= ?')
           .get(level, score).n + 1;
}
function boardTop(level, limit = BOARD_SIZE) {
  const one = normOneLevel(level);
  const n = Math.max(1, Math.min(200, parseInt(limit) || BOARD_SIZE));
  const rows = one
    ? db.prepare('SELECT * FROM scores WHERE level = ? ORDER BY score DESC, id ASC LIMIT ?').all(one, n)
    : db.prepare('SELECT * FROM scores ORDER BY score DESC, id ASC LIMIT ?').all(n);
  return rows.map(rowToScore);
}
// 遊戲中/結束時用:榜首分數、上榜門檻、這個分數是第幾名、有沒有擠進前 20
function boardStat(level, score) {
  const one = normOneLevel(level) || DEFAULT_LEVEL;
  const top = boardTop(one, BOARD_SIZE);
  const sc = (score === null || score === undefined || score === '' || !Number.isFinite(+score))
    ? null : Math.round(+score);
  const out = {
    level: one,
    size: BOARD_SIZE,
    count: top.length,
    top1: top.length ? top[0].score : 0,
    cut: top.length >= BOARD_SIZE ? top[BOARD_SIZE - 1].score : 0,   // 上榜門檻
  };
  if (sc !== null) {
    out.score = sc;
    out.rank = rankOf(one, sc);
    out.qualify = sc > 0 && out.rank <= BOARD_SIZE;
  }
  return out;
}
function cleanName(v) {
  const s = String(v == null ? '' : v).replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 12);
  return s || '無名氏';
}
function addScore(body) {
  const level = normOneLevel(body.level) || DEFAULT_LEVEL;
  const score = Math.max(0, Math.min(9999999, Math.round(Number(body.score) || 0)));
  const mode = body.mode === 'duel' ? 'duel' : 'solo';
  const int = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  const info = db.prepare(
    `INSERT INTO scores (name,score,level,mode,correct,total,max_combo)
     VALUES (?,?,?,?,?,?,?)`
  ).run(cleanName(body.name), score, level, mode, int(body.correct, 999), int(body.total, 999), int(body.maxCombo, 999));
  const id = Number(info.lastInsertRowid);
  const rank = db.prepare(
    'SELECT COUNT(*) AS n FROM scores WHERE level = ? AND (score > ? OR (score = ? AND id < ?))'
  ).get(level, score, score, id).n + 1;
  return { id, rank, level, top: boardTop(level) };
}

/* ---------- 資料轉換 ---------- */
const rowToQ = r => ({ id: r.id, q: r.question,
  o: [r.opt_a, r.opt_b, r.opt_c, r.opt_d], a: r.answer, lv: parseLevels(r.level),
  e: r.explanation || '' });

function listAll() {
  return db.prepare('SELECT * FROM questions ORDER BY sort_order, id').all().map(rowToQ);
}
function randomN(n, level) {
  const one = normOneLevel(level);
  const sql = one
    ? `SELECT * FROM questions WHERE (','||level||',') LIKE ('%,'||?||',%') ORDER BY RANDOM() LIMIT ?`
    : 'SELECT * FROM questions ORDER BY RANDOM() LIMIT ?';
  const stmt = db.prepare(sql);
  const rows = one ? stmt.all(one, n) : stmt.all(n);
  return rows.map(rowToQ);
}
function levelCounts() {
  const out = {};
  LEVELS.forEach(l => {
    out[l] = db.prepare(
      `SELECT COUNT(*) AS n FROM questions WHERE (','||level||',') LIKE ('%,'||?||',%')`).get(l).n;
  });
  return out;
}
function replaceAll(list) {
  const insert = db.prepare(
    `INSERT INTO questions (question,opt_a,opt_b,opt_c,opt_d,answer,level,explanation,sort_order)
     VALUES (?,?,?,?,?,?,?,?,?)`);
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM questions');
    list.forEach((x, i) => insert.run(x.q, x.o[0], x.o[1], x.o[2], x.o[3], x.a, levelsToStr(x.lv),
      String(x.e == null ? '' : x.e).slice(0, 500), i));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return list.length;
}
// mode: 'add' 加入題組 / 'remove' 移出題組 / 'set' 只設為此題組
function assignLevel(ids, level, mode) {
  const lv = normOneLevel(level);
  if (!lv) return 0;
  const clean = (ids || []).map(n => parseInt(n)).filter(Number.isInteger);
  if (!clean.length) return 0;
  const getStmt = db.prepare('SELECT level FROM questions WHERE id = ?');
  const updStmt = db.prepare('UPDATE questions SET level = ? WHERE id = ?');
  db.exec('BEGIN');
  try {
    clean.forEach(id => {
      const row = getStmt.get(id);
      if (!row) return;
      let cur = normLevels(row.level);
      if (mode === 'set') cur = [lv];
      else if (mode === 'remove') cur = cur.filter(l => l !== lv);
      else if (!cur.includes(lv)) cur = cur.concat(lv);          // 預設 add
      updStmt.run(cur.length ? levelsToStr(cur) : '', id);       // 允許移到空(不屬任何題組)
    });
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return clean.length;
}

/* ---------- 單題新增 / 修改 / 刪除 / 複製 / 排序 ---------- */
const EXPLAIN_MAX = 500;
const getOne = id => db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
const cleanText = (v, max) => String(v == null ? '' : v).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim().slice(0, max);

// 前端送來的 {q,o,a,lv,e} → 可直接寫進資料庫的欄位
function toRow(x) {
  return {
    q: cleanText(x.q, 300),
    o: x.o.map(o => cleanText(o, 200)),
    a: x.a,
    lv: levelsToStr(x.lv),
    e: cleanText(x.e, EXPLAIN_MAX),
  };
}
function createQuestion(x) {
  const r = toRow(x);
  const next = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM questions').get().n;
  const info = db.prepare(
    `INSERT INTO questions (question,opt_a,opt_b,opt_c,opt_d,answer,level,explanation,sort_order)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(r.q, r.o[0], r.o[1], r.o[2], r.o[3], r.a, r.lv, r.e, next);
  return rowToQ(getOne(Number(info.lastInsertRowid)));
}
function updateQuestion(id, x) {
  if (!getOne(id)) return null;
  const r = toRow(x);
  db.prepare(
    `UPDATE questions SET question=?, opt_a=?, opt_b=?, opt_c=?, opt_d=?, answer=?, level=?, explanation=?
     WHERE id=?`
  ).run(r.q, r.o[0], r.o[1], r.o[2], r.o[3], r.a, r.lv, r.e, id);
  return rowToQ(getOne(id));
}
function deleteQuestion(id) {
  return Number(db.prepare('DELETE FROM questions WHERE id = ?').run(id).changes) > 0;
}
// 複製一題,插在原題的後面
function copyQuestion(id) {
  const row = getOne(id);
  if (!row) return null;
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE questions SET sort_order = sort_order + 1 WHERE sort_order > ?').run(row.sort_order);
    const info = db.prepare(
      `INSERT INTO questions (question,opt_a,opt_b,opt_c,opt_d,answer,level,explanation,sort_order)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).run(row.question + '(複本)', row.opt_a, row.opt_b, row.opt_c, row.opt_d,
          row.answer, row.level, row.explanation, row.sort_order + 1);
    db.exec('COMMIT');
    return rowToQ(getOne(Number(info.lastInsertRowid)));
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
// 與上一題 / 下一題對調位置(dir: 'up' | 'down')
function moveQuestion(id, dir) {
  const list = db.prepare('SELECT id FROM questions ORDER BY sort_order, id').all().map(r => r.id);
  const i = list.indexOf(id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return false;
  [list[i], list[j]] = [list[j], list[i]];
  const upd = db.prepare('UPDATE questions SET sort_order = ? WHERE id = ?');
  db.exec('BEGIN');
  try {
    list.forEach((qid, k) => upd.run(k, qid));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return true;
}

/* ---------- 驗證 ---------- */
// 單題檢查:題目、四個選項、正解。回傳錯誤訊息字串,沒問題回傳 null
function validateOne(x) {
  if (!x || typeof x.q !== 'string' || !x.q.trim()) return '題目不可空白';
  if (!Array.isArray(x.o) || x.o.length !== 4 || x.o.some(o => !String(o).trim()))
    return '四個選項都要填寫';
  if (!Number.isInteger(x.a) || x.a < 0 || x.a > 3) return '請選一個正解(A~D)';
  return null;
}
function validate(list) {
  if (!Array.isArray(list)) return '資料格式錯誤';
  if (list.length < 2) return '題庫至少需要 2 題';
  for (let i = 0; i < list.length; i++) {
    const err = validateOne(list[i]);
    if (err) return `第 ${i + 1} 題:${err}`;
  }
  return null;
}

/* ---------- HTTP 工具 ---------- */
const send = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};
const readBody = req => new Promise((resolve, reject) => {
  let b = ''; req.on('data', c => { b += c; if (b.length > 5e6) req.destroy(); });
  req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
  req.on('error', reject);
});
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon' };

/* ---------- 路由 ---------- */
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // --- API ---
    if (path === '/api/questions' && req.method === 'GET') {
      return send(res, 200, { questions: listAll() });
    }
    if (path === '/api/quiz' && req.method === 'GET') {
      const n = Math.max(1, Math.min(100, parseInt(url.searchParams.get('n')) || 10));
      const level = url.searchParams.get('level') || '';
      return send(res, 200, { questions: randomN(n, level) });
    }
    if (path === '/api/levels' && req.method === 'GET') {
      return send(res, 200, { levels: LEVELS, counts: levelCounts() });
    }
    if (path === '/api/questions/bulk' && req.method === 'PUT') {
      const body = await readBody(req);
      const err = validate(body.questions);
      if (err) return send(res, 400, { error: err });
      const count = replaceAll(body.questions);
      return send(res, 200, { ok: true, count });
    }
    if (path === '/api/questions/level' && req.method === 'PUT') {
      const body = await readBody(req);
      if (!LEVELS.includes(body.level)) return send(res, 400, { error: '分類須為 煩惱診療室/熟悉又陌生的詞彙/翻轉傳統迷思/佛系密碼大解謎' });
      const mode = ['add', 'remove', 'set'].includes(body.mode) ? body.mode : 'add';
      const count = assignLevel(body.ids, body.level, mode);
      return send(res, 200, { ok: true, count });
    }
    // 新增一題(後台「＋ 新增題目」)
    if (path === '/api/questions' && req.method === 'POST') {
      const body = await readBody(req);
      const err = validateOne(body);
      if (err) return send(res, 400, { error: err });
      return send(res, 200, { ok: true, question: createQuestion(body) });
    }
    // 針對單一題目: /api/questions/<id>  或  /api/questions/<id>/copy|move
    const qm = path.match(/^\/api\/questions\/(\d+)(?:\/(copy|move))?$/);
    if (qm) {
      const id = parseInt(qm[1]);
      const act = qm[2];
      if (!act && req.method === 'PUT') {
        const body = await readBody(req);
        const err = validateOne(body);
        if (err) return send(res, 400, { error: err });
        const q = updateQuestion(id, body);
        if (!q) return send(res, 404, { error: '找不到這一題(可能已被刪除)' });
        return send(res, 200, { ok: true, question: q });
      }
      if (!act && req.method === 'DELETE') {
        if (db.prepare('SELECT COUNT(*) AS n FROM questions').get().n <= 1)
          return send(res, 400, { error: '題庫至少要保留 1 題' });
        if (!deleteQuestion(id)) return send(res, 404, { error: '找不到這一題(可能已被刪除)' });
        return send(res, 200, { ok: true });
      }
      if (act === 'copy' && req.method === 'POST') {
        const q = copyQuestion(id);
        if (!q) return send(res, 404, { error: '找不到這一題(可能已被刪除)' });
        return send(res, 200, { ok: true, question: q });
      }
      if (act === 'move' && req.method === 'PUT') {
        const body = await readBody(req);
        const dir = body.dir === 'up' ? 'up' : 'down';
        return send(res, 200, { ok: true, moved: moveQuestion(id, dir) });
      }
    }
    /* --- 排行榜 --- */
    // 取排行榜(前 20 名);帶 score 時一併回傳這個分數的名次與是否上榜
    if (path === '/api/leaderboard' && req.method === 'GET') {
      const level = url.searchParams.get('level') || '';
      const limit = url.searchParams.get('limit');
      const scoreParam = url.searchParams.get('score');
      const stat = boardStat(level, scoreParam === null ? null : scoreParam);
      return send(res, 200, { ...stat, top: boardTop(level, limit || BOARD_SIZE) });
    }
    // 送出成績(上榜才會呼叫)
    if (path === '/api/leaderboard' && req.method === 'POST') {
      const body = await readBody(req);
      if (!Number.isFinite(Number(body.score))) return send(res, 400, { error: '分數格式錯誤' });
      return send(res, 200, { ok: true, ...addScore(body) });
    }
    // 清空排行榜(後台用):不帶 level 清全部
    if (path === '/api/leaderboard' && req.method === 'DELETE') {
      const one = normOneLevel(url.searchParams.get('level') || '');
      const info = one
        ? db.prepare('DELETE FROM scores WHERE level = ?').run(one)
        : db.prepare('DELETE FROM scores').run();
      return send(res, 200, { ok: true, deleted: Number(info.changes) });
    }
    if (path === '/api/reset' && req.method === 'POST') {
      db.exec('DELETE FROM questions');
      seedDefaults();
      return send(res, 200, { ok: true, count: listAll().length });
    }
    if (path.startsWith('/api/')) return send(res, 404, { error: 'not found' });

    // --- 靜態檔 ---
    let file = path === '/' ? 'index.html'
             : path === '/admin' ? 'admin.html'
             : path.replace(/^\//, '');
    if (file.includes('..')) return send(res, 403, { error: 'forbidden' });
    try {
      const buf = await readFile(join(__dirname, file));
      res.writeHead(200, {
        'Content-Type': MIME[extname(file)] || 'application/octet-stream',
        // 本機單機遊戲，改完檔案重新整理就要立刻生效，不留快取
        'Cache-Control': 'no-store, must-revalidate',
      });
      res.end(buf);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  } catch (e) {
    send(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log('  佛學知識王 伺服器已啟動');
  console.log('  資料庫:', DB_PATH);
  console.log('  請用瀏覽器開啟:  http://localhost:' + PORT);
  console.log('  (關閉此視窗即停止伺服器)');
});
