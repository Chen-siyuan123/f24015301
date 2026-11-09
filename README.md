# 愤怒的小鸟 · 弹弓大作战

基于 **Flask + Matter.js** 的网页版愤怒的小鸟小游戏，可直接部署到腾讯云 CloudBase（云托管）。

## 功能

- 4 个关卡：翠绿山谷、石头城堡、玻璃塔、终极堡垒
- 拖拽弹弓蓄力瞄准，白色圆点实时预测弹道
- 4 种小鸟技能（飞行中点击屏幕触发）：红鸟硬撞、黄鸟加速、蓝鸟分裂、黑鸟爆炸
- 木箱 / 玻璃 / 石头三种材质，按撞击力度逐级破坏
- 计分、三星评价、关卡进度（localStorage）、全服排行榜（Flask 接口）
- WebAudio 合成音效，无需额外音频文件；支持手机触屏

## 目录结构

```
angry-birds/
├─ app.py              # Flask 后端：静态页面 + 排行榜接口
├─ requirements.txt    # 依赖
├─ Dockerfile          # 腾讯云 CloudBase 云托管构建文件
├─ static/
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/levels.js     # 关卡、材质、小鸟参数
│  ├─ js/audio.js      # 音效
│  ├─ js/render.js     # Canvas 渲染
│  ├─ js/ui.js         # HUD / 弹窗 / 排行榜
│  ├─ js/game.js       # 物理与游戏流程
│  └─ vendor/matter.min.js
└─ data/scores.json    # 排行榜数据（运行时自动生成）
```

## 本地运行（老师给的方式）

### 方式一：venv

```bash
python -m venv myenv
myenv\Scripts\activate          # Windows，Mac/Linux 用 source myenv/bin/activate
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple
python app.py
```

### 方式二：conda

```bash
conda create -n myenv1108 python=3.10 -y
conda activate myenv1108
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple
python app.py
```

浏览器打开 <http://127.0.0.1:8000> 即可游玩。

## 部署到腾讯云 CloudBase（云托管）

1. 打开 <https://tcb.cloud.tencent.com/> 并登录（微信 / QQ）。
2. 首次使用先开通「云开发 / CloudBase」环境，记下环境 ID。
3. 进入 **云托管** → **新建服务**，选择「本地代码 / 上传代码」方式。
4. 上传本项目目录（或把代码推到 GitHub/Gitee 后用仓库部署）。
5. 平台会自动识别根目录的 `Dockerfile` 构建镜像。
   - 监听端口：**5000**（`Dockerfile` 已设置 `ENV PORT=5000`，`app.py` 会读取 `PORT` 环境变量）
   - 云托管控制台的「服务端口」也要填 **5000**，必须与容器内监听端口一致
   - 内存 / CPU 选最小规格即可。
6. 点击「部署」，等待构建完成，得到形如
   `https://xxxx-xxxx.sh.run.tcloudbase.com` 的访问域名，即老师示例中的链接形式。

命令行部署（可选，安装 CloudBase CLI）：

```bash
npm i -g @cloudbase/cli
tcb login
tcb run deploy --service-name angry-birds --path .
```

> 说明：排行榜数据写在容器内的 `data/scores.json`，容器重启后可能重置；如需持久化可改用云数据库。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 游戏页面 |
| GET | `/healthz` | 健康检查 |
| GET | `/api/leaderboard` | 排行榜前 10 |
| POST | `/api/score` | 提交成绩 `{"name":"","score":0,"level":1}` |

## 操作

- 按住弹弓上的小鸟拖动瞄准，松手发射
- 飞行过程中点击屏幕 / 轻触手机，触发小鸟技能
- `R` 键重玩本关
