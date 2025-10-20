import { _decorator, Component, EntityNode } from '@dao3fun/component';
const { apclass } = _decorator;

@apclass('PlayerController')
export class PlayerController extends Component<GameEntity> {
  start() {}

  update(deltaTime: number) {}
}
