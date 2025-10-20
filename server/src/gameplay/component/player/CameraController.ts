import { _decorator, Component, EntityNode } from '@dao3fun/component';
const { apclass } = _decorator;

@apclass('CameraController')
export class CameraController extends Component<GameEntity> {
  start() {}

  update(deltaTime: number) {}
}
