/*:
 * @target MZ
 * @plugindesc 🪄 SimpleReturnSpell v1.1 — 拠点へ即帰還する軽量ワープ魔法（同一マップ対応）
 * @author MintoSoft
 * @url https://sites.google.com/view/mintotukino/%E3%83%9B%E3%83%BC%E3%83%A0/%E3%83%84%E3%82%AF%E3%83%BC%E3%83%ABmz%E7%94%A8%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E7%BD%AE%E3%81%8D%E5%A0%B4
 *
 * @help
 * ------------------------------------------------------------
 * 🪄 SimpleReturnSpell v1.1
 * 作者: MintoSoft
 * 代表: 月ノみんと（X: @MintoTsukino）
 * URL: https://sites.google.com/view/mintotukino/ホーム/ツクールmz用プラグイン置き場
 * ------------------------------------------------------------
 * 💠 概要
 * どこからでも「拠点（登録したマップ）」へ即帰還できる
 * 軽量プラグインです。コモンイベント不要・競合ほぼゼロ。
 * 同一マップ内でもフェード付きワープが可能になりました。
 *
 * ------------------------------------------------------------
 * 💡 特徴
 * - コマンド/スクリプト1行で帰還
 * - 拠点登録制（setReturnPoint → Return）
 * - 戦闘中使用可否を設定可能
 * - SE/フェード演出内蔵
 * - 同一マップでもワープ表現対応（v1.1）
 *
 * ------------------------------------------------------------
 * 🧩 使い方
 * 1. プラグインパラメータで初期帰還先を設定
 * 2. イベントコマンド > プラグインコマンド > 「Return」 で発動
 * 3. またはスクリプトから：
 *    $gameSystem.runReturnSpell();
 *    $gameSystem.setReturnPoint(mapId, x, y);
 *
 * ------------------------------------------------------------
 * 🧷 利用規約
 * ・クレジット：MintoSoft／月ノみんと を明記してください。
 * ・上記URLをどこかに記載していただけると嬉しいです。
 * ・改変／改造は自己責任でOKです。
 * ・商用利用の際は X（旧Twitter）@MintoTsukino のDMまでご相談ください。
 * ・再配布／転売は禁止です。
 *
 * ------------------------------------------------------------
 *
 * @param defaultMap
 * @text 初期帰還マップID
 * @type number
 * @min 1
 * @default 1
 *
 * @param defaultX
 * @text 初期X座標
 * @type number
 * @min 0
 * @default 10
 *
 * @param defaultY
 * @text 初期Y座標
 * @type number
 * @min 0
 * @default 8
 *
 * @param fadeType
 * @text フェードタイプ
 * @type select
 * @option 黒フェード
 * @value 0
 * @option 白フェード
 * @value 1
 * @option フェードなし
 * @value 2
 * @default 1
 *
 * @param seName
 * @text 効果音
 * @type file
 * @dir audio/se
 * @default Move1
 *
 * @param allowInBattle
 * @text 戦闘中使用可
 * @type boolean
 * @default false
 *
 * @command Return
 * @text リターンスペル発動
 * @desc 拠点に帰還します。
 *
 * @command setReturnPoint
 * @text 帰還先を登録
 * @desc 現在位置を新たな帰還先に設定します。
 */

(() => {
  'use strict';

  const PLUGIN_NAME = "SimpleReturnSpell";
  const P = PluginManager.parameters(PLUGIN_NAME);

  const DEFAULT_POINT = {
    mapId: Number(P.defaultMap || 1),
    x: Number(P.defaultX || 10),
    y: Number(P.defaultY || 8)
  };

  const FADE_TYPE = Number(P.fadeType || 1);
  const SE_NAME = String(P.seName || "Move1");
  const ALLOW_IN_BATTLE = P.allowInBattle === "true";

  // -------------------------------------------------------
  // 🪄 Core
  // -------------------------------------------------------
  const ReturnSpell = {
    _point: { ...DEFAULT_POINT },

    setPoint(mapId, x, y) {
      this._point = { mapId, x, y };
      $gameSystem._returnPoint = this._point;
      console.log(`[ReturnSpell] Set return point: Map${mapId} (${x},${y})`);
    },

    getPoint() {
      return $gameSystem._returnPoint || { ...DEFAULT_POINT };
    },

    run() {
      const pt = this.getPoint();

      // バトル中ガード
      if (SceneManager._scene instanceof Scene_Battle && !ALLOW_IN_BATTLE) {
        AudioManager.playSe({ name: 'Buzzer1', volume: 90, pitch: 100, pan: 0 });
        $gameMessage.add("今は帰還できない！");
        return;
      }

      // 効果音
      if (SE_NAME) {
        AudioManager.playSe({ name: SE_NAME, volume: 90, pitch: 100, pan: 0 });
      }

      // 転送本体（遅延演出）
      setTimeout(() => {
        const mapId = Number(pt.mapId || 1);
        const x = Number(pt.x || 0);
        const y = Number(pt.y || 0);

        if (mapId === $gameMap.mapId()) {
          // 同一マップ → locate＋手動フェード演出
          if (FADE_TYPE !== 2) {
            const isWhite = (FADE_TYPE === 1);
            SceneManager._scene.startFadeOut(12, isWhite);
            setTimeout(() => {
              $gamePlayer.locate(x, y);
              SceneManager._scene.startFadeIn(12, isWhite);
            }, 250);
          } else {
            $gamePlayer.locate(x, y);
          }
        } else {
          // 通常転送
          $gamePlayer.reserveTransfer(mapId, x, y, 2, FADE_TYPE);
        }
      }, 400);
    }
  };

  // -------------------------------------------------------
  // 🧭 Game_System 拡張
  // -------------------------------------------------------
  const _Game_System_initialize = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function() {
    _Game_System_initialize.call(this);
    if (!this._returnPoint) this._returnPoint = { ...DEFAULT_POINT };
  };

  Game_System.prototype.setReturnPoint = function(mapId, x, y) {
    ReturnSpell.setPoint(mapId, x, y);
  };

  Game_System.prototype.runReturnSpell = function() {
    ReturnSpell.run();
  };

  // -------------------------------------------------------
  // 🔧 プラグインコマンド
  // -------------------------------------------------------
  PluginManager.registerCommand(PLUGIN_NAME, "Return", () => ReturnSpell.run());
  PluginManager.registerCommand(PLUGIN_NAME, "setReturnPoint", () => {
    const mapId = $gameMap.mapId();
    const x = $gamePlayer.x;
    const y = $gamePlayer.y;
    ReturnSpell.setPoint(mapId, x, y);
    $gameMessage.add("帰還先を登録した！");
  });

})();
