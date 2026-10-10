import { useNavigate } from "react-router";

interface PracticeNavProps {
  /** 流程步骤名称，例如 ["抽题", "准备", "朗读", "评分"] */
  steps?: string[];
  /** 当前步骤下标；小于 0 时不高亮 */
  current?: number;
  /** 上一步；不传则不显示「上一步」按钮 */
  onPrev?: () => void;
  /** 正在录音：离开前需要用户确认放弃本次录音 */
  isRecording?: boolean;
  /** 离开页面前的清理（停止录音、计时器） */
  onLeave?: () => void;
}

const CONFIRM_MSG = "正在录音，确定要放弃本次录音吗？";

export default function PracticeNav({ steps, current = -1, onPrev, isRecording, onLeave }: PracticeNavProps) {
  const navigate = useNavigate();
  const confirmed = () => !isRecording || window.confirm(CONFIRM_MSG);

  const goHome = () => {
    if (!confirmed()) return;
    onLeave?.();
    navigate("/");
  };
  const goPrev = () => {
    if (!onPrev || !confirmed()) return;
    onPrev();
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={goHome} className="text-sm font-medium text-navy-500 hover:text-navy-600 transition-colors">
          ← 返回主页
        </button>
        {onPrev && (
          <button onClick={goPrev} className="text-sm font-medium text-navy-400 hover:text-navy-600 transition-colors">
            ← 上一步
          </button>
        )}
      </div>
      {steps && (
        <div className="flex items-center gap-2">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  i === current
                    ? "bg-navy-500 text-white"
                    : i < current
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}. {label}
              </span>
              {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
