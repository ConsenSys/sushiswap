import { tryParseAmount } from '@sushiswap/currency'
import { ChefType, Pool, usePool } from '@sushiswap/client'
import { useIsMounted } from '@sushiswap/hooks'
import { AppearOnMount, Dots } from '@sushiswap/ui'
import { getMasterChefContractConfig, useMasterChefWithdraw } from '@sushiswap/wagmi'
import { FC, useMemo, useState } from 'react'

import { useGraphPool } from '../../lib/hooks'
import { usePoolPositionStaked } from '../PoolPositionStakedProvider'
import { RemoveSectionUnstakeWidget } from './RemoveSectionUnstakeWidget'
import { useSWRConfig } from 'swr'
import { Checker } from '@sushiswap/wagmi/future/systems'
import Button from '@sushiswap/ui/future/components/button/Button'
import { useApproved, withCheckerRoot } from '@sushiswap/wagmi/future/systems/Checker/Provider'
import { APPROVE_TAG_UNSTAKE } from '../../lib/constants'
import { ChainId } from '@sushiswap/chain'

interface AddSectionStakeProps {
  pool: Pool
  chefType: ChefType
  farmId: number
}

export const RemoveSectionUnstake: FC<{ poolId: string }> = ({ poolId }) => {
  const isMounted = useIsMounted()
  const { data: pool } = usePool({ args: poolId, swrConfig: useSWRConfig() })

  if (!pool) return <></>

  if (!pool?.incentives || pool.incentives.length === 0 || !isMounted) return <></>

  return (
    <AppearOnMount show={true}>
      <_RemoveSectionUnstake
        pool={pool}
        chefType={pool.incentives[0].chefType}
        farmId={Number(pool.incentives[0].pid)}
      />
    </AppearOnMount>
  )
}

export const _RemoveSectionUnstake: FC<AddSectionStakeProps> = withCheckerRoot(({ pool, chefType, farmId }) => {
  const [value, setValue] = useState('')
  const {
    data: { reserve0, reserve1, liquidityToken },
  } = useGraphPool(pool)
  const { balance } = usePoolPositionStaked()
  const { approved } = useApproved(APPROVE_TAG_UNSTAKE)
  const amount = useMemo(() => {
    return tryParseAmount(value, liquidityToken)
  }, [liquidityToken, value])

  const { sendTransaction, isLoading: isWritePending } = useMasterChefWithdraw({
    chainId: liquidityToken.chainId,
    amount,
    pid: farmId,
    chef: chefType,
    enabled: approved,
  })

  return (
    <RemoveSectionUnstakeWidget
      chainId={pool.chainId as ChainId}
      value={value}
      setValue={setValue}
      reserve0={reserve0}
      reserve1={reserve1}
      liquidityToken={liquidityToken}
    >
      <Checker.Connect size="xl" fullWidth>
        <Checker.Network size="xl" fullWidth chainId={pool.chainId}>
          <Checker.Custom
            showGuardIfTrue={Boolean(amount && balance && amount.greaterThan(balance))}
            guard={
              <Button size="xl" fullWidth>
                Insufficient Balance
              </Button>
            }
          >
            <Checker.ApproveERC20
              size="xl"
              fullWidth
              id="unstake-approve-slp"
              amount={amount}
              contract={getMasterChefContractConfig(pool.chainId, chefType)?.address}
              enabled={Boolean(getMasterChefContractConfig(pool.chainId, chefType)?.address)}
            >
              <Checker.Success tag={APPROVE_TAG_UNSTAKE}>
                <Button
                  onClick={() => sendTransaction?.()}
                  fullWidth
                  size="xl"
                  variant="filled"
                  disabled={!approved || isWritePending}
                  testId="unstake-liquidity"
                >
                  {isWritePending ? <Dots>Confirm transaction</Dots> : 'Unstake Liquidity'}
                </Button>
              </Checker.Success>
            </Checker.ApproveERC20>
          </Checker.Custom>
        </Checker.Network>
      </Checker.Connect>
    </RemoveSectionUnstakeWidget>
  )
})
