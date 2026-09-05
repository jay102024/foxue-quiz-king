/* ============================================================
   佛學知識王 - 藍牙搶答按鈕韌體 (ESP32-C3 SuperMini)
   ------------------------------------------------------------
   • 板子當成「藍牙鍵盤」連到電腦,按下 4 顆按鈕分別送出按鍵。
   • 網頁把這些按鍵當成 A/B/C/D 搶答輸入。
   • 兩塊板子:一塊燒成 PLAYER 1,另一塊改成 PLAYER 2,再燒一次。

        玩家一 (PLAYER 1)  A B C D → 送出  1 2 3 4
        玩家二 (PLAYER 2)  A B C D → 送出  7 8 9 0

   接線 (4 顆按鈕):
        按鈕 A → GPIO4   ┐
        按鈕 B → GPIO5   │ 每顆按鈕另一腳一起接到 GND
        按鈕 C → GPIO6   │ (使用內部上拉,按下 = 接地 = LOW)
        按鈕 D → GPIO7   ┘
   ============================================================ */

#include <Arduino.h>
#include <BleKeyboard.h>

/* ====== 燒錄前改這裡:這塊板子是哪一位玩家?(1 或 2) ====== */
#define PLAYER 1
/* ========================================================== */

#if PLAYER == 1
  #define DEV_NAME "button1"                  // 電腦藍牙清單顯示的名稱
  const char KEYS[4] = { '1', '2', '3', '4' }; // A B C D
#else
  #define DEV_NAME "button2"
  const char KEYS[4] = { '7', '8', '9', '0' }; // A B C D
#endif

// 4 顆按鈕的腳位(對應 A、B、C、D)
const uint8_t BTN_PIN[4]  = { 4, 5, 6, 7 };
const char*   BTN_NAME[4] = { "A", "B", "C", "D" };

// C3 SuperMini 板載 LED:GPIO8,低電位亮(連上藍牙後恆亮;沒有此 LED 也不影響)
#define LED_PIN 8

BleKeyboard bleKeyboard(DEV_NAME, "Quiz Button", 100);

// --- 去彈跳 (debounce) ---
const uint16_t DEBOUNCE_MS = 30;
bool     stableState[4] = { HIGH, HIGH, HIGH, HIGH };
bool     lastReading[4] = { HIGH, HIGH, HIGH, HIGH };
uint32_t lastChange[4]  = { 0, 0, 0, 0 };

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 4; i++) pinMode(BTN_PIN[i], INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);   // 先熄滅

  bleKeyboard.begin();
  Serial.printf("\n[%s] 已啟動,請到電腦藍牙設定搜尋並配對此裝置...\n", DEV_NAME);
}

void loop() {
  bool connected = bleKeyboard.isConnected();
  digitalWrite(LED_PIN, connected ? LOW : HIGH);   // 連上藍牙 → LED 亮

  uint32_t now = millis();
  for (int i = 0; i < 4; i++) {
    bool reading = digitalRead(BTN_PIN[i]);

    if (reading != lastReading[i]) {               // 讀值變化 → 重新計時
      lastReading[i] = reading;
      lastChange[i]  = now;
    }
    // 穩定超過去彈跳時間,且與目前穩定值不同 → 視為有效變化
    if ((now - lastChange[i]) > DEBOUNCE_MS && reading != stableState[i]) {
      stableState[i] = reading;
      if (reading == LOW) {                         // 由放開變成按下
        Serial.printf("按下 %s → 送出 '%c'\n", BTN_NAME[i], KEYS[i]);
        if (connected) bleKeyboard.write(KEYS[i]);
      }
    }
  }
  delay(5);
}
