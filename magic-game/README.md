# 🪄 마법학교 쿼터뷰 미니 게임

이미지 파일 없이 Canvas 도형만으로 그린 2D 쿼터뷰(아이소메트릭) 미니 게임입니다.
외부 라이브러리 의존성이 없습니다.

## 웹사이트에 넣기

`magic-game.js`를 사이트에 복사한 뒤, 게임을 넣을 위치에 두 줄만 추가하세요.

```html
<div data-magic-game></div>
<script src="magic-game.js"></script>
```

직접 제어하려면:

```html
<div id="game"></div>
<script src="magic-game.js"></script>
<script>
  const game = MagicQuarterGame.mount(document.getElementById('game'), { hat: true });
  // game.score, game.focus(), game.destroy()
</script>
```

React 등 SPA에서는 `useEffect`에서 `mount`하고 cleanup에서 `destroy()`를 호출하면 됩니다.

## 조작

| 키 | 동작 |
|---|---|
| WASD / 방향키 | 이동 |
| Space | 빗자루 탑승/착지 (속도 2배, 나무·호수·울타리·오두막 위로 비행) |
| F | 바라보는 방향으로 마법 탄환 발사 (누르고 있으면 연사) |

- 게임 화면을 클릭해야 키 입력을 받습니다. 그래서 게임 밖에서는 방향키/스페이스가 원래대로 페이지를 스크롤합니다.
- 모바일에서는 화면에 터치 버튼이 표시됩니다.
- 🎃 호박(+1), 🧚 픽시(+3)를 맞히고, 비행 중 🏅 퀴디치 골대를 통과(+5)하면 점수를 얻습니다.
- 성벽과 탑은 비행으로도 넘을 수 없고, 남쪽 성문으로 들어갈 수 있습니다.

## 커스터마이즈

`magic-game.js` 상단 상수에서 조절할 수 있습니다: `WALK_SPEED`, `FLY_SPEED`, `FLY_Z`(비행 고도, 이보다 낮은 장애물은 넘어감), `FIRE_COOLDOWN`, `BOLT_SPEED`, 그리고 `OBJ`(장애물 높이). 맵 배치는 `generateMap()`에서 바꿀 수 있습니다.
