import { TestBed } from '@angular/core/testing'
import {
  type KazumiPolicy,
  zKazumiPolicy,
} from '@danmaku-anywhere/extension-protocol'
import {
  provideQueryClient,
  QueryClient,
  queryOptions,
} from '@tanstack/angular-query-experimental'
import { describe, expect, it, vi } from 'vitest'
import { KazumiService } from '../services/kazumi.service'
import { SearchResultsComponent } from './kazumi-search-results'

/**
 * A search that fails on an API rule is usually an extension that predates
 * API support, so the panel has to say that instead of showing only the raw
 * error. Xpath rules keep the plain error, which is not about the extension
 * version.
 */

const xpathRule = {
  api: '4',
  type: 'anime',
  name: '7sefun',
  version: '1.3',
  baseURL: 'https://www.7sefun.top/',
  searchURL: 'https://www.7sefun.top/search?wd=@keyword',
  searchList: '//div',
  searchName: '//a',
  searchResult: '//a',
  chapterRoads: '//div',
  chapterResult: '//a',
}

const apiRule = {
  ...xpathRule,
  name: 'xfdmnext',
  baseURL: 'https://next.xifanacg.com/',
  searchURL: '',
  searchList: '',
  searchName: '',
  searchResult: '',
  chapterRoads: '',
  chapterResult: '',
  searchMode: 'api',
  chapterMode: 'api',
  searchApiConfig: { request: { method: 'POST', url: 'https://example.com' } },
}

function setup(policy: KazumiPolicy) {
  TestBed.configureTestingModule({
    imports: [SearchResultsComponent],
    providers: [
      provideQueryClient(
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      ),
      {
        provide: KazumiService,
        useValue: {
          getSearchQueryOptions: (keyword: string, p: KazumiPolicy) =>
            queryOptions({
              queryKey: ['kazumi-search', p.name, keyword],
              queryFn: () =>
                Promise.reject(
                  new Error(
                    `Rule "${p.name}" searches through an API, which is not supported`
                  )
                ),
              staleTime: Number.POSITIVE_INFINITY,
            }),
        },
      },
    ],
  })

  const fixture = TestBed.createComponent(SearchResultsComponent)
  fixture.componentRef.setInput('policy', policy)
  fixture.componentRef.setInput('keyword', 'frieren')
  fixture.autoDetectChanges()
  return fixture
}

describe('SearchResultsComponent', () => {
  it('asks the user to update the extension when an api rule fails', async () => {
    const fixture = setup(zKazumiPolicy.parse(apiRule))

    await vi.waitFor(() => {
      expect(fixture.nativeElement.textContent).toContain(
        '请将浏览器扩展更新到支持 API 规则的最新版本'
      )
    })

    fixture.destroy()
  })

  it('keeps the plain error for an xpath rule', async () => {
    const fixture = setup(zKazumiPolicy.parse(xpathRule))

    await vi.waitFor(() => {
      expect(fixture.nativeElement.textContent).toContain('搜索错误')
    })
    expect(fixture.nativeElement.textContent).not.toContain(
      '请将浏览器扩展更新到支持 API 规则的最新版本'
    )

    fixture.destroy()
  })
})
