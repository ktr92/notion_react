import { useState } from "react";
import { supabase } from "../lib/supabase";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleIsSignUp(): void {
    setIsSignUp((prev) => !prev);
    setError(null);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }

  }

  function handleEmailChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const target = event.target as HTMLInputElement;
    setEmail(target.value);
  }

  function handlePasswordChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const target = event.target as HTMLInputElement;
    setPassword(target.value);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            {isSignUp && "Создать аккаунт"}
            {!isSignUp && "С возвращением"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ваша база знаний в облаке
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={(e) => handleSubmit(e)}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              value={email}
              onChange={handleEmailChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              value={password}
              onChange={handlePasswordChange}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed mt-2"
              disabled={loading}
          >
            {loading && "Загрузка..."}
            {!loading && isSignUp && "Зарегистрироваться"}
            {!loading && !isSignUp && "Войти"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          
            onClick={handleIsSignUp}
          >
           {!isSignUp && "Нет аккаунта? Зарегистрироваться"}
           {isSignUp && "Уже есть аккаунт? Войти"}            
          </button>
        </div>
      </div>
    </div>
  );
}
