import { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Компонент экрана авторизации (Вход / Регистрация).
 * Важно: этот компонент не принимает никаких пропсов от App.tsx.
 * После успешного входа/регистрации Supabase SDK сам сохраняет сессию и оповещает
 * слушателя onAuthStateChange в App.tsx, который автоматически переключает экран.
 */
export function Auth() {
  // Управляемые состояния для полей формы
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Переключатель режима: false — форма входа, true — форма регистрации
  const [isSignUp, setIsSignUp] = useState(false);

  // Флаг загрузки: блокирует кнопку отправки на время сетевого запроса к Supabase
  const [loading, setLoading] = useState(false);

  // Текст ошибки от Supabase (например, неверный пароль или занятый email)
  const [error, setError] = useState<string | null>(null);

  // Переключает режим "Вход <-> Регистрация" и очищает старую ошибку с экрана
  function handleIsSignUp(): void {
    setIsSignUp((prev) => !prev);
    setError(null);
  }

  // Единый обработчик отправки формы для обоих режимов
  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault(); // Отменяем стандартную перезагрузку страницы браузером
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Регистрация нового пользователя (работает мгновенно, т.к. Confirm Email отключен в настройках Supabase)
        // Важно: Supabase SDK не кидает исключение (throw) при логических ошибках (слабый пароль и т.д.),
        // а возвращает ошибку внутри объекта { error }, поэтому проверяем её явно через if (error).
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        }
      } else {
        // Авторизация существующего пользователя по Email и паролю
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        }
      }
    } catch (error) {
      // Сработает только при критическом сбое сети или падении самого JS-кода
      console.log(error);
    } finally {
      // Гарантированно разблокируем кнопку после завершения запроса (успешного или с ошибкой)
      setLoading(false);
    }

  }

  // Синхронизация инпута Email со стейтом (Controlled Input)
  function handleEmailChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const target = event.target as HTMLInputElement;
    setEmail(target.value);
  }

  // Синхронизация инпута Пароля со стейтом (Controlled Input)
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

        {/* Блок вывода ошибки от сервера, рендерится только когда error !== null */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Событие onSubmit вешается именно на <form>, чтобы работала отправка и по клику, и по нажатию Enter */}
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
              minLength={6} // Стандартное требование Supabase к минимальной длине пароля
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              value={password}
              onChange={handlePasswordChange}
            />
          </div>

          {/* Главная кнопка отправки формы: блокируется (disabled) во время сетевого запроса */}
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

        {/* Кнопка переключения между экраном входа и экраном регистрации (type="button", чтобы не отправлять форму) */}
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
