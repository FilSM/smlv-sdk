<?php

namespace Smlv\Sdk;

use Smlv\Sdk\Exceptions\SmlvApiException;

/**
 * SMLV Billing Service
 *
 * Вся логика списания депозита — разрешение аккаунта по email,
 * проверка баланса, создание debit-транзакции, кэш account_reference.
 *
 * Использование из SaaS-приложения (Yii2):
 *
 *   // Списать напрямую по account_reference
 *   Yii::$app->smlv->billing->charge($accountRef, 1.50, 'Bill #123', ['doc_id' => 123]);
 *
 *   // Списать по email, если account_reference неизвестен
 *   Yii::$app->smlv->billing->chargeByEmail('user@example.com', 1.50, 'Bill #123');
 *
 *   // Только разрешить account_reference по email (без списания)
 *   $ref = Yii::$app->smlv->billing->resolveAccountByEmail('user@example.com');
 */
class SmlvBillingService
{
    /** @var SmlvClient */
    private $client;

    /** @var SmlvBalanceChecker */
    private $balanceChecker;

    /**
     * In-memory кэш: email => account_reference.
     * Сбрасывается при завершении запроса (in-memory).
     *
     * @var array<string, string|null>
     */
    private $emailCache = [];

    /**
     * @param SmlvClient        $client
     * @param SmlvBalanceChecker $balanceChecker
     */
    public function __construct(SmlvClient $client, SmlvBalanceChecker $balanceChecker)
    {
        $this->client         = $client;
        $this->balanceChecker = $balanceChecker;
    }

    // =========================================================================
    // Публичный API
    // =========================================================================

    /**
     * Списать сумму с аккаунта по account_reference.
     *
     * @param string  $accountReference  SMLV account_reference, напр. ACC_A1B2C3D4
     * @param float   $amount            Сумма списания
     * @param string  $description       Описание транзакции
     * @param array   $metadata          Произвольные метаданные (doc_id, model, source, …)
     *
     * @return bool   true — списание выполнено, false — баланс недостаточен или API недоступен
     * @throws SmlvApiException  при критической ошибке API (не при 404 / нет баланса)
     */
    public function charge(
        string $accountReference,
        float $amount,
        string $description,
        array $metadata = []
    ): bool {
        if ($amount <= 0) {
            return false;
        }

        return $this->balanceChecker->deductBalance(
            $accountReference,
            $amount,
            $description,
            $metadata
        );
    }

    /**
     * Разрешить account_reference по email и списать сумму.
     *
     * Аккаунт ищется через API /v1/accounts/search?email=…
     * Результат кэшируется в памяти в рамках текущего запроса.
     *
     * @param string  $email        Email пользователя в SMLV
     * @param float   $amount       Сумма списания
     * @param string  $description  Описание транзакции
     * @param array   $metadata     Произвольные метаданные
     *
     * @return bool  true — списание выполнено, false — аккаунт не найден / баланс недостаточен
     * @throws SmlvApiException  при критической ошибке API
     */
    public function chargeByEmail(
        string $email,
        float $amount,
        string $description,
        array $metadata = []
    ): bool {
        $accountRef = $this->resolveAccountByEmail($email);
        if ($accountRef === null) {
            return false;
        }

        return $this->charge($accountRef, $amount, $description, $metadata);
    }

    /**
     * Разрешить account_reference по email без списания.
     *
     * @param string $email
     * @return string|null  account_reference или null, если аккаунт не найден
     * @throws SmlvApiException  при ошибке API (кроме 404)
     */
    public function resolveAccountByEmail(string $email): ?string
    {
        $email = strtolower(trim($email));

        if (array_key_exists($email, $this->emailCache)) {
            return $this->emailCache[$email];
        }

        $account = $this->client->findAccountByEmail($email);
        $ref     = $account['account_reference'] ?? ($account['reference'] ?? null);

        $this->emailCache[$email] = $ref;

        return $ref;
    }

    /**
     * Проверить достаточность баланса (без списания).
     *
     * @param string $accountReference
     * @param float  $amount           Требуемая сумма
     * @return bool
     */
    public function hasBalance(string $accountReference, float $amount): bool
    {
        return $this->balanceChecker->canAfford($accountReference, $amount);
    }

    /**
     * Получить текущий баланс аккаунта.
     *
     * @param string $accountReference
     * @param bool   $forceRefresh  Обойти кэш
     * @return float
     * @throws SmlvApiException
     */
    public function getBalance(string $accountReference, bool $forceRefresh = false): float
    {
        return $this->balanceChecker->getBalance($accountReference, $forceRefresh);
    }

    /**
     * Сбросить кэш email→reference для указанного email.
     *
     * @param string $email
     * @return void
     */
    public function clearEmailCache(string $email): void
    {
        unset($this->emailCache[strtolower(trim($email))]);
    }

    /**
     * Сбросить весь in-memory кэш email→reference.
     *
     * @return void
     */
    public function clearAllEmailCache(): void
    {
        $this->emailCache = [];
    }
}
