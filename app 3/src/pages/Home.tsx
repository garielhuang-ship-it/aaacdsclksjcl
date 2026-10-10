import { useNavigate } from "react-router";
import { Mic, BookOpen, Layers, Shield, Award, Headphones } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-riell-subtle">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-riell-gradient">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-gold-400 rounded-full" />
          <div className="absolute bottom-10 right-10 w-48 h-48 border border-gold-400/50 rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-gold-400 rounded-full" />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-gold-400 rounded-full" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gold-500 rounded-lg flex items-center justify-center shadow-glow">
              <Shield className="w-7 h-7 text-navy-900" />
            </div>
            <span className="text-gold-400 font-semibold text-lg tracking-wider">RIEL</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white text-center font-display mb-4">
            杯外人口语训练平台
          </h1>
          <p className="text-lg text-blue-100/80 text-center max-w-2xl mx-auto mb-8">
            针对外研社杯全国中学生外语素养大赛的在线口语训练系统
            <br />
            AI 智能出题 · 实时语音评测 · 个性化改进建议
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 text-sm text-blue-100/70">
              <Award className="w-4 h-4 text-gold-400" />
              <span>33 篇朗读真题</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-100/70">
              <Headphones className="w-4 h-4 text-gold-400" />
              <span>AI 即兴问答</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-100/70">
              <Mic className="w-4 h-4 text-gold-400" />
              <span>语音实时转写</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Selection */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="riell-section-title justify-center mb-3">
            <Layers className="w-6 h-6 text-gold-500" />
            选择训练模式
          </h2>
          <p className="text-muted-foreground">根据你的需求选择适合的训练方式</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Full Simulation */}
          <button
            onClick={() => navigate("/full-simulation")}
            className="riell-card-gradient group text-left p-8 hover:scale-[1.02] transition-all duration-300"
          >
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-white/20 transition-colors">
              <Layers className="w-7 h-7 text-gold-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 font-display">完整模拟</h3>
            <p className="text-blue-100/80 text-sm leading-relaxed mb-4">
              完整还原比赛流程：先进行英文朗读（准备 1 分钟，朗读 2 分钟），随后进入英文问答（准备 30 秒，回答 1.5 分钟）
            </p>
            <div className="flex items-center gap-2 text-gold-400 text-sm font-medium">
              <span>开始模拟</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Reading Practice */}
          <button
            onClick={() => navigate("/reading")}
            className="riell-card group text-left p-8 hover:border-gold-300/50 transition-all duration-300"
          >
            <div className="w-14 h-14 bg-navy-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-navy-100 transition-colors">
              <BookOpen className="w-7 h-7 text-navy-500" />
            </div>
            <h3 className="text-xl font-bold text-navy-500 mb-2 font-display">朗读训练</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              从 33 篇真题题库中随机抽取短文，进行限时朗读练习，AI 评价语音准确度与流畅度
            </p>
            <div className="flex items-center gap-2 text-navy-500 text-sm font-medium">
              <span>开始练习</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Speaking Practice */}
          <button
            onClick={() => navigate("/speaking")}
            className="riell-card group text-left p-8 hover:border-gold-300/50 transition-all duration-300"
          >
            <div className="w-14 h-14 bg-gold-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-gold-100 transition-colors">
              <Mic className="w-7 h-7 text-gold-600" />
            </div>
            <h3 className="text-xl font-bold text-navy-500 mb-2 font-display">问答训练</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              AI 根据外研社杯风格生成即兴问答题，模拟真实比赛场景，训练理解与思辨能力
            </p>
            <div className="flex items-center gap-2 text-navy-500 text-sm font-medium">
              <span>开始练习</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h2 className="riell-section-title justify-center mb-3">
              <Award className="w-6 h-6 text-gold-500" />
              平台特色
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: "真题题库",
                desc: "33 篇外研社杯地区预赛朗读真题，涵盖科普、记叙、演讲等多种文体",
              },
              {
                icon: Mic,
                title: "语音评测",
                desc: "基于浏览器原生 ASR 技术，实时将语音转为文本并进行内容完整度分析",
              },
              {
                icon: Layers,
                title: "AI 出题",
                desc: "DeepSeek 大模型根据大赛风格自动生成即兴问答题，无限扩展题库",
              },
              {
                icon: Shield,
                title: "专业评价",
                desc: "AI 从理解能力、思辨能力、语音语调三个维度给出详细评分和改进建议",
              },
            ].map((feature) => (
              <div key={feature.title} className="riell-card p-6 text-center">
                <div className="w-12 h-12 bg-navy-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-navy-500" />
                </div>
                <h4 className="font-semibold text-navy-500 mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-100 bg-white/50 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-navy-400" />
            <span>杯外人口语训练平台 · 助力外研社杯备赛</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
