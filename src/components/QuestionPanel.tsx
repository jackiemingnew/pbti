import type { Answer, Character, Question } from "../types";

type QuestionPanelProps = {
  character: Character;
  questions: Question[];
  selectedAnswers: Answer[];
  isLoading: boolean;
  error?: string;
  onAnswer: (questionIndex: number, answer: Answer) => void;
};

export function QuestionPanel({ character, questions, selectedAnswers, isLoading, error, onAnswer }: QuestionPanelProps) {
  return (
    <section className="rounded-3xl border border-amber-500/40 bg-zinc-950/86 p-5 shadow-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div className={`grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br ${character.avatarStyle} text-2xl`}>♠</div>
        <div>
          <p className="text-sm text-amber-400">{character.name} 正在观察牌桌</p>
          <h2 className="text-xl font-black text-amber-100">回答人格问题</h2>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-400/10 p-4 text-sm font-bold text-amber-100">
          正在召唤 OpenAI 生成本手题库...
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-sm leading-6 text-red-100">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {questions.map((question, questionIndex) => (
          <div key={question.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="font-bold text-zinc-100">{question.text}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {question.answers.map((answer) => {
                const selected = selectedAnswers[questionIndex]?.id === answer.id;
                return (
                  <button
                    key={answer.id}
                    onClick={() => onAnswer(questionIndex, answer)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition hover:scale-[1.01] ${
                      selected
                        ? "border-amber-300 bg-amber-400 text-zinc-950"
                        : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-amber-500 hover:text-amber-100"
                    }`}
                  >
                    {answer.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
