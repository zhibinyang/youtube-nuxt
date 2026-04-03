export interface TocItem {
  id: string
  level: number
  text: string
  collapsed?: boolean
  children?: TocItem[]
}
